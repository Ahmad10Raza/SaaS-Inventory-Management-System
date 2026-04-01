import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Warehouse, Plus, X, Loader2, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import Can from '@/components/common/Can';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  capacity: z.coerce.number().min(0).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export default function WarehousesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/warehouses', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Warehouse created!'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/warehouses/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Updated!'); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Warehouse deactivated'); },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); reset(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your warehouse locations</p>
        </div>
        <Can permission="warehouse.create">
          <Button onClick={() => { reset(); setShowModal(true); }} className="gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Add Warehouse
          </Button>
        </Can>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : warehouses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Warehouse className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No warehouses yet. Add your first warehouse.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(warehouses as any[]).map((w: any) => (
            <Card key={w._id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{w.name}</CardTitle>
                      {w.address?.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {w.address.city}, {w.address.state}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {w.capacity && (
                    <div><p className="text-muted-foreground text-xs">Capacity</p><p className="font-medium">{w.capacity.toLocaleString()}</p></div>
                  )}
                  {w.phone && (
                    <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{w.phone}</p></div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Can permission="warehouse.update">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      setEditingId(w._id);
                      ['name', 'capacity', 'phone', 'email'].forEach(k => setValue(k as any, w[k] || ''));
                      setShowModal(true);
                    }}>Edit</Button>
                  </Can>
                  <Can permission="warehouse.delete">
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Deactivate?')) deleteMut.mutate(w._id); }}>Delete</Button>
                  </Can>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => editingId ? updateMut.mutate({ id: editingId, data: d }) : createMut.mutate(d))} className="p-6 space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{(errors.name as any).message}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Capacity</Label><Input type="number" {...register('capacity')} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
