/**
 * Logo du site : image choisie dans « Identité du site », sinon pastille
 * aux couleurs de marque. Le nom est affiché à côté sauf `iconOnly`.
 */
export function BrandMark({
  name,
  logoUrl,
  size = 28,
  className = "",
  nameClassName = "",
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" style={{ height: size, width: "auto" }} className="max-w-[160px] object-contain" />
      ) : (
        <span
          className="inline-block shrink-0 rounded-full bg-camargue"
          style={{ height: size, width: size }}
          aria-hidden
        />
      )}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}
