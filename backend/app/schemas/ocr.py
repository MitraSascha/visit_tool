from pydantic import BaseModel


class OcrResult(BaseModel):
    company_name:        str | None = None
    contact_name:        str | None = None
    job_title:           str | None = None
    phone:               str | None = None
    mobile:              str | None = None
    email:               str | None = None
    website:             str | None = None
    street:              str | None = None
    zip_code:            str | None = None
    city:                str | None = None
    # Felder die Claude aus Kontext ableitet
    category:            str | None = None
    trade:               str | None = None
    service_description: str | None = None
    service_area:        str | None = None
    tags:                str | None = None  # kommagetrennt
    raw_text:            str = ""
