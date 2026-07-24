
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.websocket_manager import LARGE_EXPENSE_THRESHOLD, broadcast_safe
from app.dependencies.auth import require_roles
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseOut
from app.utils.enums import Role


router = APIRouter(prefix="/expenses", tags=["expenses"], dependencies=[
    Depends(require_roles(Role.FINANCIAL_ANALYST.value))
],)


@router.get("/", response_model=list[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.FINANCIAL_ANALYST.value)),
):
    """List all expenses."""
    return db.query(Expense).order_by(Expense.created_at.desc()).all()


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.FINANCIAL_ANALYST.value)),
):
    """Get a single expense by ID."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
    return expense


@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.FINANCIAL_ANALYST.value)),
):
    """Log an expense."""
    expense = Expense(**data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    broadcast_safe(
        "expense_logged",
        {"expense_id": expense.id, "vehicle_id": expense.vehicle_id, "amount": expense.amount, "category": expense.category}
    )
    if expense.amount >= LARGE_EXPENSE_THRESHOLD:
        broadcast_safe(
            "large_expense_alert",
            {"expense_id": expense.id, "vehicle_id": expense.vehicle_id, "amount": expense.amount}
        )
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.FINANCIAL_ANALYST.value)),
):
    """Delete an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
    db.delete(expense)
    db.commit()
