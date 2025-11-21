import { Button, Card } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-2xl font-bold mb-4">Přístup odepřen</h2>
        <p className="text-gray-600 mb-6">
          Nemáte oprávnění pro zobrazení této stránky.
        </p>
        <Button onClick={() => navigate('/')}>
          Zpět na Úvodní stránku
        </Button>
      </Card>
    </div>
  );
};
