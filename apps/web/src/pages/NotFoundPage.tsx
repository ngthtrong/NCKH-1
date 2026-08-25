import { Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="full-page-state">
      <Typography variant="h2">404</Typography>
      <Typography color="text.secondary">Không tìm thấy trang bạn yêu cầu.</Typography>
      <Button component={Link} to="/dashboard" variant="contained">
        Về trang tổng quan
      </Button>
    </main>
  );
}
