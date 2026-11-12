import unicodedata

from django.core.exceptions import ValidationError


class SymbolValidator:
    def validate(self, password, user=None):
        if not any(unicodedata.category(char)[0] in {'P', 'S'} for char in password):
            raise ValidationError(
                'Le mot de passe doit contenir au moins un symbole (ex. !, @, #).',
                code='password_no_symbol',
            )

    def get_help_text(self):
        return 'Votre mot de passe doit contenir au moins un symbole (ex. !, @, #).'
