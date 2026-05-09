"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Loader2,
  Smartphone,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { TILE_COLOR_PRESETS } from "@/lib/tile-presets";
import { TileGrid } from "@/components/tiles/tile-grid";
import type { AdminTile } from "@/types/admin";
import type { Tile, TileChild, TileCommuneMini } from "@/types/api";

type Props = {
  initialTiles: AdminTile[];
};

const KIND_LABELS: Record<string, string> = {
  internal_route: "Lien interne",
  external_url: "Lien externe",
  module: "Module",
};

type SaveStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; at: number }
  | { state: "error"; message: string };

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Convertit une AdminTile en Tile (type public) pour pouvoir réutiliser
 * <TileGrid>/<TileItem> dans la preview. Les sous-tuiles ne sont pas
 * remontées ici (la preview affiche uniquement le 1er niveau de la home —
 * c'est ce qu'on optimise depuis cette page).
 */
function adminToPublicTile(
  tile: AdminTile,
  childrenByParent: Map<number, AdminTile[]>,
): Tile {
  const childAdmin = childrenByParent.get(tile.id) ?? [];
  const children: TileChild[] = childAdmin.map(adminToPublicTileChild);
  const visible_on_communes: TileCommuneMini[] = tile.visible_on_communes_detail;
  return {
    ...adminToPublicTileChild(tile),
    show_on_home: tile.show_on_home,
    visible_on_communes,
    has_children: tile.has_children,
    children,
  };
}

function adminToPublicTileChild(tile: AdminTile): TileChild {
  return {
    id: tile.id,
    label: tile.label,
    icon: tile.icon,
    color: tile.color,
    cover_image: tile.cover_image,
    kind: tile.kind,
    internal_path: tile.internal_path,
    external_url: tile.external_url,
    module_key: tile.module_key,
    sort_order: tile.sort_order,
    is_active: tile.is_active,
    span_2x: tile.span_2x,
    target_url: tile.target_url,
  };
}

export function TilesAdmin({ initialTiles }: Props) {
  const [tiles, setTiles] = useState<AdminTile[]>(initialTiles);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }, // évite les drags accidentels
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Re-calcul à chaque changement de tiles : tuiles racine triées,
  // dictionnaire des enfants par parent.
  const { roots, childrenByParent } = useMemo(() => {
    const sortFn = (a: AdminTile, b: AdminTile) =>
      a.sort_order - b.sort_order || a.label.localeCompare(b.label);
    const roots = tiles
      .filter((t) => t.parent === null)
      .sort(sortFn);
    const childrenByParent = new Map<number, AdminTile[]>();
    for (const t of tiles) {
      if (t.parent === null) continue;
      const arr = childrenByParent.get(t.parent) ?? [];
      arr.push(t);
      childrenByParent.set(t.parent, arr);
    }
    for (const arr of childrenByParent.values()) arr.sort(sortFn);
    return { roots, childrenByParent };
  }, [tiles]);

  // Preview : tuiles racine actives ET visibles sur la home globale.
  // C'est exactement le filtre que la home applique côté API.
  const previewTiles = useMemo(
    () =>
      roots
        .filter((t) => t.is_active && t.show_on_home)
        .map((t) => adminToPublicTile(t, childrenByParent)),
    [roots, childrenByParent],
  );

  const persistOrder = (orderedRoots: AdminTile[]) => {
    // sort_order par pas de 10 — laisse de la place pour des insertions
    // manuelles ultérieures sans re-numéroter toute la liste.
    const payload = {
      tiles: orderedRoots.map((t, idx) => ({ id: t.id, sort_order: idx * 10 })),
    };
    setStatus({ state: "saving" });
    startTransition(async () => {
      let csrf = readCsrfToken();
      if (!csrf) {
        await apiFetch("/api/auth/csrf/");
        csrf = readCsrfToken();
      }
      try {
        const res = await apiFetch("/api/admin/tiles/reorder/", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus({
            state: "error",
            message:
              (data as { detail?: string }).detail
              || "Erreur lors de la sauvegarde de l'ordre.",
          });
          return;
        }
        setStatus({ state: "saved", at: Date.now() });
      } catch {
        setStatus({
          state: "error",
          message: "Erreur réseau, l'ordre n'a pas été sauvegardé.",
        });
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = roots.findIndex((t) => t.id === active.id);
    const newIndex = roots.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(roots, oldIndex, newIndex);

    // Met à jour le state global : on remplace les sort_order des tuiles
    // racine, on garde tel quel les enfants (leur ordre relatif n'est pas
    // affecté par ce drag).
    const newOrderById = new Map(reordered.map((t, i) => [t.id, i * 10]));
    setTiles((prev) =>
      prev.map((t) =>
        t.parent === null && newOrderById.has(t.id)
          ? { ...t, sort_order: newOrderById.get(t.id)! }
          : t,
      ),
    );

    persistOrder(reordered);
  };

  return (
    <>
      {/* === PREVIEW === */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Smartphone className="h-4 w-4 text-[#1a4d6e]" aria-hidden />
          Aperçu de la home
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({previewTiles.length} tuile{previewTiles.length > 1 ? "s" : ""}{" "}
            visible{previewTiles.length > 1 ? "s" : ""})
          </span>
        </div>
        {previewTiles.length === 0 ? (
          <p className="rounded-md bg-slate-50 p-4 text-center text-xs text-slate-500">
            Aucune tuile n&apos;est active + visible sur la home actuellement.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-slate-50 p-3">
            <TileGrid tiles={previewTiles} />
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          La home publique met jusqu&apos;à 5 minutes à refléter les
          changements (cache Next). Cet aperçu, lui, est mis à jour
          immédiatement.
        </p>
      </section>

      {/* === STATUS BAR === */}
      <SaveStatusBadge status={status} />

      {/* === LIST DRAGGABLE === */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={roots.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {roots.map((tile) => {
              const children = childrenByParent.get(tile.id) ?? [];
              return (
                <SortableTileRow key={tile.id} tile={tile}>
                  {children.length > 0 ? (
                    <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-4">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">
                        Sous-tuiles ({children.length})
                      </p>
                      {children.map((c) => (
                        <TileRow key={c.id} tile={c} isChild />
                      ))}
                    </div>
                  ) : null}
                </SortableTileRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status.state === "idle") {
    return (
      <p className="mb-3 text-xs text-slate-500">
        Glisse-dépose une tuile par sa poignée{" "}
        <GripVertical className="-mt-0.5 inline h-3 w-3" /> pour réorganiser
        l&apos;ordre. Sauvegarde automatique.
      </p>
    );
  }
  if (status.state === "saving") {
    return (
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Sauvegarde en cours…
      </p>
    );
  }
  if (status.state === "saved") {
    return (
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Ordre sauvegardé.
      </p>
    );
  }
  return (
    <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
      <AlertCircle className="h-3 w-3" aria-hidden />
      {status.message}
    </p>
  );
}

function SortableTileRow({
  tile,
  children,
}: {
  tile: AdminTile;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TileRow
        tile={tile}
        isChild={false}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </TileRow>
    </div>
  );
}

function TileRow({
  tile,
  isChild,
  children,
  dragHandleProps,
}: {
  tile: AdminTile;
  isChild: boolean;
  children?: React.ReactNode;
  /** Si fourni, ajoute une poignée de drag sur le bord gauche. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const preset = TILE_COLOR_PRESETS[tile.color];
  return (
    <div
      className={
        "rounded-xl border bg-white p-3 transition " +
        (isChild
          ? "border-slate-200"
          : "border-slate-300 shadow-sm")
      }
    >
      <div className="flex items-center gap-3">
        {dragHandleProps ? (
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
            aria-label={`Réordonner ${tile.label}`}
            title="Glisser pour réorganiser"
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
        ) : null}

        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xs font-medium ${preset.bg} ${preset.text}`}
          title={`Couleur ${preset.label}`}
        >
          {tile.icon ? tile.icon.slice(0, 3) : "?"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{tile.label}</span>
            {tile.has_children ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#1a4d6e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1a4d6e]">
                <Layers className="h-2.5 w-2.5" />
                avec sous-tuiles
              </span>
            ) : null}
            {tile.span_2x ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                large
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span>
              {KIND_LABELS[tile.kind]} :{" "}
              <code className="text-[11px]">{tile.target_url || "—"}</code>
              {tile.kind === "external_url" ? (
                <ExternalLink className="ml-1 inline h-3 w-3" />
              ) : null}
            </span>
            <span>ordre {tile.sort_order}</span>
            {tile.visible_on_communes_detail.length > 0 ? (
              <span>
                {tile.visible_on_communes_detail.length} commune
                {tile.visible_on_communes_detail.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-slate-400">toutes communes</span>
            )}
            {!tile.show_on_home ? (
              <span className="text-amber-600">absent home globale</span>
            ) : null}
          </div>
        </div>

        <span
          className="hidden sm:inline-flex"
          title={tile.is_active ? "Active" : "Inactive"}
        >
          {tile.is_active ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-slate-400" />
          )}
        </span>

        <Link
          href={`/admin/tiles/${tile.id}/edit`}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Éditer"
        >
          <Edit className="h-4 w-4" />
        </Link>
      </div>

      {children}
    </div>
  );
}
