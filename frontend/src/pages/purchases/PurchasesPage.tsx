import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Eye, Trash2, CheckCircle, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import Can from '@/components/common/Can';

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<any>(null);

  // Form states for Create Purchase
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [transportCost, setTransportCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [showReceiveModal, setShowReceiveModal] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [quickEdit, setQuickEdit] = useState<{ id: string; type: 'status' | 'payment'; current: any } | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'cash', notes: '' });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: () => api.get('/purchases', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => api.get('/vendors', { params: { limit: 100 } }).then(r => r.data?.data || []),
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
    mutationFn: (d: any) => api.post('/purchases', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      toast.success('Purchase Order created!');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status, items }: { id: string; status: string; items?: any[] }) => 
      api.put(`/purchases/${id}/status`, { status, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Record updated!');
      setShowViewModal(null);
      setShowReceiveModal(null);
      setQuickEdit(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update status'),
  });

  const recordPaymentMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.post(`/purchases/${id}/payment`, {
      amount: Number(dto.amount),
      paymentMethod: dto.method,
      notes: dto.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Payment recorded!');
      setQuickEdit(null);
      setPayForm({ amount: 0, method: 'cash', notes: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record payment'),
  });

  const closeModal = () => {
    setShowModal(false);
    setVendorId('');
    setWarehouseId('');
    setExpectedDeliveryDate('');
    setTransportCost(0);
    setPaidAmount(0);
    setPaymentMethod('');
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([...items, { variantId: '', productName: '', quantity: 1, unitPrice: 0, taxPercentage: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'variantId') {
      // Find the variant across all products
      let foundVariant: any = null;
      let foundProd: any = null;
      products?.forEach((p: any) => {
        const v = p.variants?.find((v: any) => v._id === value);
        if (v) { foundVariant = v; foundProd = p; }
      });

      if (foundVariant) {
        newItems[index] = { 
          ...newItems[index], 
          variantId: foundVariant._id, 
          productName: `${foundProd.name} - ${foundVariant.sku}`, 
          unitPrice: foundVariant.costPrice || foundVariant.price, 
          taxPercentage: foundProd.taxPercentage || 0 
        };
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return toast.error('Select a vendor');
    if (items.length === 0) return toast.error('Add at least one item');
    createMut.mutate({ 
      vendorId, 
      warehouseId, 
      expectedDeliveryDate, 
      transportCost: Number(transportCost),
      paidAmount: Number(paidAmount),
      paymentMethod,
      items: items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), taxPercentage: Number(i.taxPercentage) })) 
    });
  };

  const columns = [
    { key: 'purchaseNumber', label: 'PO #', render: (i: any) => <span className="font-semibold text-primary">{i.purchaseNumber}</span> },
    { key: 'vendorId', label: 'Vendor', render: (i: any) => i.vendorId?.name || '-' },
    { key: 'status', label: 'Status', render: (i: any) => (
      <div 
        className="cursor-pointer group flex items-center gap-1" 
        onClick={(e) => { e.stopPropagation(); setQuickEdit({ id: i._id, type: 'status', current: i }); }}
      >
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          i.status === 'received' || i.status === 'fully_received' ? 'bg-green-100 text-green-700' :
          i.status === 'ordered' || i.status === 'approved' ? 'bg-blue-100 text-blue-700' :
          i.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>{i.status.replace('_', ' ')}</span>
        <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )},
    { key: 'paymentStatus', label: 'Payment', render: (i: any) => (
      <div 
        className="cursor-pointer group flex items-center gap-1"
        onClick={(e) => { e.stopPropagation(); setQuickEdit({ id: i._id, type: 'payment', current: i }); }}
      >
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          i.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
          i.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-700'
        }`}>{i.paymentStatus}</span>
        <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )},
    { key: 'totalAmount', label: 'Total', render: (i: any) => `₹${i.totalAmount?.toLocaleString()}` },
    { key: 'createdAt', label: 'Date', render: (i: any) => new Date(i.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <DataTable
        title="Purchases"
        description="Manage purchase orders and supplier deliveries"
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        searchPlaceholder="Search PO number..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onPageChange={setPage}
        onAdd={() => setShowModal(true)}
        onView={(i) => setShowViewModal(i)}
        addLabel="Create PO"
        addPermission="purchase.create"
        viewPermission="purchase.view"
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in py-10">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-full flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create Purchase Order</h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={vendorId} onChange={e => setVendorId(e.target.value)} required>
                      <option value="">Select Vendor</option>
                      {vendors?.map((v: any) => <option key={v._id} value={v._id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deliver To Warehouse</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="">Select Warehouse (Optional)</option>
                      {warehouses?.map((w: any) => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Delivery Date</Label>
                    <Input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Items *</Label>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}><Plus className="w-4 h-4 mr-1"/> Add Item</Button>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Product</th>
                          <th className="px-3 py-2 text-left font-medium w-24">Qty</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Unit Price</th>
                          <th className="px-3 py-2 text-left font-medium w-24">Tax %</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Total</th>
                          <th className="px-3 py-2 text-center w-12 text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No items added</td></tr>
                        ) : items.map((item, index) => {
                          const itemTotal = (item.quantity * item.unitPrice) * (1 + (item.taxPercentage/100));
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">
                                <select className="flex h-8 w-full rounded border bg-background px-2 py-1 text-xs" value={item.variantId} onChange={e => handleItemChange(index, 'variantId', e.target.value)} required>
                                  <option value="">Select Variant...</option>
                                  {products?.map((p: any) => (
                                    <optgroup key={p._id} label={p.name}>
                                      {p.variants?.map((v: any) => (
                                        <option key={v._id} value={v._id}>{p.name} ({v.sku})</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2"><Input type="number" min="1" className="h-8 text-xs px-2" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required /></td>
                              <td className="px-3 py-2"><Input type="number" min="0" step="0.01" className="h-8 text-xs px-2" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} required /></td>
                              <td className="px-3 py-2"><Input type="number" min="0" className="h-8 text-xs px-2" value={item.taxPercentage} onChange={e => handleItemChange(index, 'taxPercentage', e.target.value)} /></td>
                              <td className="px-3 py-2 font-medium bg-muted/30">₹{itemTotal.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4 mx-auto" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <Label>Transport Cost</Label>
                        <Input type="number" step="0.01" className="h-8 w-32 text-xs px-2" value={transportCost} onChange={e => setTransportCost(Number(e.target.value))} />
                      </div>
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm font-semibold">Payment Details (Optional)</p>
                        <div className="flex justify-between items-center text-sm">
                          <Label>Amount Paid</Label>
                          <Input type="number" step="0.01" className="h-8 w-32 text-xs px-2 border-primary/50" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <Label>Method</Label>
                          <select className="h-8 w-32 text-xs px-2 rounded border bg-background" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            <option value="">None / Credit</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="po-form" disabled={createMut.isPending || items.length === 0}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View/Action Modal */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-auto animate-scale-in flex flex-col max-h-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Order <span className="text-primary">{showViewModal.purchaseNumber}</span>
              </h2>
              <button onClick={() => setShowViewModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div><p className="text-muted-foreground mb-1">Status</p><p className="font-semibold uppercase">{showViewModal.status}</p></div>
                <div><p className="text-muted-foreground mb-1">Total Amount</p><p className="font-semibold">₹{showViewModal.totalAmount?.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground mb-1">Vendor</p><p className="">{showViewModal.vendorId?.name || '-'}</p></div>
                <div><p className="text-muted-foreground mb-1">Created At</p><p className="">{new Date(showViewModal.createdAt).toLocaleDateString()}</p></div>
              </div>

              <Label className="text-base font-semibold mb-3 block">Items ({showViewModal.items?.length})</Label>
              <div className="space-y-3 mb-6">
                {showViewModal.items?.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{it.productName}</p>
                      <p className="text-muted-foreground text-xs">{it.quantity} x ₹{it.unitPrice}</p>
                    </div>
                    <div className="font-semibold">₹{it.totalPrice?.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
               <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium mb-2">Actions Update:</p>
                {showViewModal.status === 'pending' && (
                  <Can permission="purchase.update">
                    <Button className="w-full gap-2"
                     onClick={() => updateStatusMut.mutate({ id: showViewModal._id, status: 'approved' })}
                     disabled={updateStatusMut.isPending}
                    >
                     <CheckCircle className="w-4 h-4" /> Approve Order
                    </Button>
                  </Can>
                )}
                {(showViewModal.status === 'approved' || showViewModal.status === 'partially_received') && (
                  <Can permission="purchase.approve_received">
                    <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                     onClick={() => {
                       const initialQtys: Record<string, number> = {};
                       showViewModal.items.forEach((it: any) => {
                         initialQtys[it.variantId] = it.quantity - it.receivedQuantity;
                       });
                       setReceiveQuantities(initialQtys);
                       setShowReceiveModal(showViewModal);
                       setShowViewModal(null);
                     }}
                     disabled={updateStatusMut.isPending || !showViewModal.warehouseId}
                    >
                     <PackageCheck className="w-4 h-4" /> {showViewModal.status === 'partially_received' ? 'Receive More Stock' : 'Mark as Received (Step-by-step)'}
                    </Button>
                  </Can>
                )}
                {!showViewModal.warehouseId && showViewModal.status === 'approved' && (
                   <p className="text-xs text-red-500 text-center">Cannot receive stock: No warehouse assigned</p>
                )}
                {['pending', 'approved'].includes(showViewModal.status) && (
                   <Can permission="purchase.cancel">
                     <Button variant="outline" className="w-full text-red-500"
                      onClick={() => { if(confirm('Cancel order?')) updateStatusMut.mutate({ id: showViewModal._id, status: 'cancelled' })}}
                     >Cancel Order</Button>
                   </Can>
                )}
               </div>
            </div>
          </div>
        </div>
      )}
      {/* Receive Input Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in py-10">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-4 animate-scale-in flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Incoming Stock: {showReceiveModal.purchaseNumber}</h2>
              <button onClick={() => setShowReceiveModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">Enter the quantities that have physically arrived in the warehouse.</p>
              <div className="space-y-4">
                {showReceiveModal.items.map((it: any) => {
                  const remaining = it.quantity - it.receivedQuantity;
                  if (remaining <= 0) return null;
                  return (
                    <div key={it.variantId} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/5">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{it.productName}</p>
                        <p className="text-xs text-muted-foreground">Ordered: {it.quantity} | Already Received: {it.receivedQuantity}</p>
                      </div>
                      <div className="w-24">
                        <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">Arrived Now</Label>
                        <Input 
                          type="number" 
                          max={remaining} 
                          min={0}
                          value={receiveQuantities[it.variantId] || 0}
                          onChange={(e) => setReceiveQuantities({...receiveQuantities, [it.variantId]: Number(e.target.value)})}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-muted/10">
              <Button variant="outline" onClick={() => setShowReceiveModal(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  const items = Object.entries(receiveQuantities)
                    .filter(([_, qty]) => qty > 0)
                    .map(([vId, qty]) => ({ variantId: vId, receivedQuantity: qty }));
                  
                  if (items.length === 0) return toast.error('Enter at least one received quantity');
                  updateStatusMut.mutate({ id: showReceiveModal._id, status: 'received', items });
                }}
                disabled={updateStatusMut.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {updateStatusMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Stock Entry
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Edit Modal */}
      {quickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-sm animate-scale-in flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Update: {quickEdit.current.purchaseNumber}</h2>
              <button onClick={() => setQuickEdit(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {quickEdit.type === 'status' ? (
              <div className="space-y-4">
                <Label>Order Status</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 'pending', label: 'Draft / Pending', color: 'bg-yellow-500' },
                    { val: 'approved', label: 'Approve Order', color: 'bg-blue-500' },
                    { val: 'cancelled', label: 'Cancel Order', color: 'bg-red-500' }
                  ].map(s => (
                    <Button 
                      key={s.val}
                      variant={quickEdit.current.status === s.val ? 'default' : 'outline'}
                      className="justify-start gap-2 h-10"
                      onClick={() => updateStatusMut.mutate({ id: quickEdit.id, status: s.val })}
                      disabled={updateStatusMut.isPending}
                    >
                      <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                   <span className="text-muted-foreground">PO Total:</span>
                   <span className="font-bold">₹{quickEdit.current.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Remaining:</span>
                   <span className="text-red-500 font-bold">₹{(quickEdit.current.totalAmount - (quickEdit.current.paidAmount || 0)).toLocaleString()}</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount..."
                    value={payForm.amount || ''}
                    onChange={e => setPayForm({...payForm, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={payForm.method}
                    onChange={e => setPayForm({...payForm, method: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI/Online</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <Button 
                  className="w-full mt-2" 
                  disabled={recordPaymentMut.isPending || !payForm.amount}
                  onClick={() => recordPaymentMut.mutate({ id: quickEdit.id, dto: payForm })}
                >
                  {recordPaymentMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Payment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
