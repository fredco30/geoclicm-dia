"""Pagination DRF par défaut du projet."""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """20 éléments par page, ajustable via ?page_size= (plafond 200).

    Le back-office charge ses listes complètes par pages de 200 au lieu de
    20 pour limiter le nombre d'appels.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
