from app.schemas.contact import ContactOut


class DuplicateContactOut(ContactOut):
    similarity_score: float
