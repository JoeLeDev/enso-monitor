
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(Text)
    version: Mapped[str] = mapped_column(String(50))

    imports: Mapped[list["DataImport"]] = relationship(
        back_populates="source"
    )
