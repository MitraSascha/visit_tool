import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models.contact import PartnerContact

router = APIRouter()


@router.get("/contacts/export/csv")
async def export_contacts_csv(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PartnerContact).order_by(PartnerContact.company_name))
    contacts = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # Header
    writer.writerow([
        "ID", "Firma", "Ansprechpartner", "Position", "Telefon", "Mobil",
        "E-Mail", "Website", "Straße", "PLZ", "Stadt", "Kategorie",
        "Gewerk", "Einsatzgebiet", "Zusammenarbeit", "Bewertung",
        "Priorität", "Notiz", "Erstellt am",
    ])

    for c in contacts:
        writer.writerow([
            c.id,
            c.company_name,
            c.contact_name or "",
            c.job_title or "",
            c.phone or "",
            c.mobile or "",
            c.email or "",
            c.website or "",
            c.street or "",
            c.zip_code or "",
            c.city or "",
            c.category or "",
            c.trade or "",
            c.service_area or "",
            c.has_worked_with_us.value if c.has_worked_with_us else "",
            c.internal_rating or "",
            c.priority.value if c.priority else "",
            c.note or "",
            c.created_at.isoformat() if c.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return StreamingResponse(
        iter([csv_content.encode("utf-8-sig")]),  # utf-8-sig für Excel-Kompatibilität
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )
