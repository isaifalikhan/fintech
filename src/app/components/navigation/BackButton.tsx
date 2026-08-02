import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';

interface BackButtonProps {
  label?: string;
  to?: string;
  onClick?: () => void;
}

export function BackButton({ label = 'Back', to, onClick }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className="border-white/10 hover:bg-white/5 text-white"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
