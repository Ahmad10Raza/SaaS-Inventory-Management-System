import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Truck, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewTransfer, setViewTransfer] = useState<any>(null);

  // Form states
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', page],
    queryFn: () => api.get('/transfers', { params: { page, limit: 20 } }).then(r => r.data),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => api.get('/warehouses').then(r => r.data || []),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get('/products', { params: { limit: 100 } }).then(r => r.data?.data || []),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/transfers', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer initiated!');
      setPage(1);
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to initiate transfer'),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => api.put(`/transfers/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer updated!');
      setViewTransfer(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const closeModal = () => {
    setShowModal(false);
    setFromWarehouseId('');
    setToWarehouseId('');
    setNotes('');
    setItems([]);
  };

  const handleAddItem = () => setItems([...items, { variantId: '', quantity: 1 }]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) return toast.error('Select warehouses');
    if (fromWarehouseId === toWarehouseId) return toast.error('Source and destination must be different');
    if (items.length === 0) return toast.error('Add at least one item');
    createMut.mutate({ fromWarehouseId, toWarehouseId, notes, items });
  };

  const columns = [
    { key: 'transferNumber', label: 'TR #', render: (i: any) => <span className="font-semibold text-primary">{i.transferNumber}</span> },
    { key: 'fromWarehouseId', label: 'From', render: (i: any) => i.fromWarehouseId?.name || '-' },
    { key: 'toWarehouseId', label: 'To', render: (i: any) => i.toWarehouseId?.name || '-' },
    { key: 'status', label: 'Status', render: (i: any) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
        i.status === 'received' ? 'bg-green-100 text-green-700' :
        i.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
        i.status === 'cancelled' ? 'bg-red-100 text-red-700' :
        'bg-yellow-100 text-yellow-700'
      }`}>{i.status.replace('_', ' ')}</span>
    )},
    { key: 'itemsCount', label: 'Items', render: (i: any) => i.items?.length || 0 },
    { key: 'createdAt', label: 'Date', render: (i: any) => new Date(i.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <DataTable
        title="Warehouse Transfers"
        description="Move stock between internal locations"
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        onPageChange={setPage}
        onAdd={() => setShowModal(true)}
        viewPermission="warehouse.view"
        onView={(i) => setViewTransfer(i)}
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in py-10">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-full flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Initiate Stock Transfer</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Warehouse *</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} required>
                      <option value="">Select Source</option>
                      {warehouses?.map((w: any) => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Warehouse *</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} required>
                      <option value="">Select Destination</option>
                      {warehouses?.map((w: any) => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items *</Label>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}><Plus className="w-4 h-4 mr-1"/> Add Item</Button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-4 items-end p-4 border rounded-lg bg-muted/20">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Product Variant</Label>
                          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={item.variantId} onChange={e => handleItemChange(index, 'variantId', e.target.value)} required>
                            <option value="">Select Variant...</option>
                            {products?.map((p: any) => (
                              <optgroup key={p._id} label={p.name}>
                                {p.variants?.map((v: any) => (
                                  <option key={v._id} value={v._id}>{p.name} ({v.sku})</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div className="w-24 space-y-2">
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} required />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">No items added yet</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..." />
                </div>
              </form>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="transfer-form" disabled={createMut.isPending || items.length === 0}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Initiate Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Transfer Modal */}
      {viewTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-auto animate-scale-in flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Transfer <span className="text-primary">{viewTransfer.transferNumber}</span>
              </h2>
              <button onClick={() => setViewTransfer(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div><p className="text-muted-foreground mb-1">From</p><p className="font-semibold">{viewTransfer.fromWarehouseId?.name}</p></div>
                <div><p className="text-muted-foreground mb-1">To</p><p className="font-semibold">{viewTransfer.toWarehouseId?.name}</p></div>
                <div><p className="text-muted-foreground mb-1">Status</p><p className="font-semibold uppercase">{viewTransfer.status}</p></div>
                <div><p className="text-muted-foreground mb-1">Date</p><p className="">{new Date(viewTransfer.createdAt).toLocaleDateString()}</p></div>
              </div>

              <div className="space-y-4">
                {viewTransfer.status === 'pending' && (
                  <Button className="w-full gap-2" onClick={() => updateStatusMut.mutate({ id: viewTransfer._id, status: 'in_transit' })} disabled={updateStatusMut.isPending}>
                    <Truck className="w-4 h-4"/> Mark as In Transit (Deduct Source)
                  </Button>
                )}
                {viewTransfer.status === 'in_transit' && (
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => updateStatusMut.mutate({ id: viewTransfer._id, status: 'received' })} disabled={updateStatusMut.isPending}>
                    <CheckCircle className="w-4 h-4"/> Confirm Received (Add Destination)
                  </Button>
                )}
                {['pending', 'in_transit'].includes(viewTransfer.status) && (
                   <Button variant="outline" className="w-full text-red-500" onClick={() => { if(confirm('Cancel?')) updateStatusMut.mutate({ id: viewTransfer._id, status: 'cancelled' })}}>Cancel Transfer</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
