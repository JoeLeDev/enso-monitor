
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class DataImport(Base):
    __tablename__ = "imports"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    status: Mapped[str] = mapped_column(String(20))
    checksum: Mapped[str] = mapped_column(String(64))
    rows_processed: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )

    source: Mapped["Source"] = relationship(back_populates="imports")
    observations: Mapped[list["Observation"]] = relationship(
        back_populates="data_import"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('running', 'success', 'failed')",
            name="ck_import_status",
        ),
        CheckConstraint(
            "rows_processed >= 0",
            name="ck_import_rows_processed",
        ),
    )
