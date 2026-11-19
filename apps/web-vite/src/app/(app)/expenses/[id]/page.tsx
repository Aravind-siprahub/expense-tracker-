import { useParams } from 'react-router-dom';
import { ExpenseForm } from '../../../_components/ExpenseForm';

export default function EditExpense() {
  const { id } = useParams<{ id: string }>();
  return <ExpenseForm id={id} />;
}
