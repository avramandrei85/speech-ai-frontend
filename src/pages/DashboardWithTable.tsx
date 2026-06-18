import { useParams } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

export default function DashboardWithTable() {
  const params = useParams<{ table?: string; session?: string }>();
  const table = params.table;
  const session = params.session;

  return <Dashboard initialTab="orders" tableId={table} sessionId={session} />;
}
