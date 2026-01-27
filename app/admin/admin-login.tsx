'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function AdminLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (!res.ok) {
      alert('Неверный PIN');
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input id="pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Например 1234" />
      </div>
      <Button onClick={submit} disabled={loading}>
        {loading ? 'Проверяем...' : 'Войти'}
      </Button>
    </div>
  );
}
