import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { mockBackend } from '../lib/mockBackend';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { FileDown, Plus, Trash2, Edit, Calendar, User, Activity, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function UserDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [sharedWorkspaces, setSharedWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ date: '', day: '', reason: '', amount: '', type: 'expense' });
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [timeView, setTimeView] = useState('monthly'); // 'weekly' or 'monthly'

  // Load shared workspaces on mount
  useEffect(() => {
    const loadShared = async () => {
      try {
        const list = await mockBackend.getSharedWorkspaces();
        setSharedWorkspaces(list);
      } catch (err) {
        console.error("Failed to load shared workspaces", err);
      }
    };
    if (user) {
      loadShared();
      setActiveWorkspaceId(user.id);
    }
  }, [user]);

  // Load transactions for the active workspace
  const loadTransactions = async () => {
    if (!activeWorkspaceId) return;
    try {
      const data = await mockBackend.getTransactions(activeWorkspaceId);
      setTransactions(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeWorkspaceId]);

  // Refresh shared workspaces list periodically or when active id changes
  const refreshWorkspaces = async () => {
    try {
      const list = await mockBackend.getSharedWorkspaces();
      setSharedWorkspaces(list);
    } catch (err) {
      console.color("Failed to refresh workspaces", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeWorkspaceId) return alert("No active workspace selected");

    const { type, ...restData } = formData;
    let finalAmount = Math.abs(Number(formData.amount));
    if (type === 'expense') finalAmount = -finalAmount;

    const dataToSave = {
      ...restData,
      amount: finalAmount
    };

    try {
      if (editingId) {
        await mockBackend.updateTransaction(editingId, dataToSave);
      } else {
        await mockBackend.addTransaction(dataToSave, activeWorkspaceId);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ date: '', day: '', reason: '', amount: '', type: 'expense' });
      loadTransactions();
    } catch (err) {
      alert(err.message || "Failed to save transaction");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await mockBackend.deleteTransaction(id);
        loadTransactions();
      } catch (err) {
        alert(err.message || "Failed to delete transaction");
      }
    }
  };

  const handleEdit = (transaction) => {
    setFormData({
      date: transaction.date || '',
      day: transaction.day || '',
      reason: transaction.reason || '',
      amount: Math.abs(transaction.amount || 0),
      type: (transaction.amount || 0) < 0 ? 'expense' : 'income'
    });
    setEditingId(transaction.id);
    setShowModal(true);
  };

  // Filter transactions by selected month
  const filteredTransactions = transactions.filter(t => {
    if (!selectedMonth) return true;
    if (!t.date) return false;
    return t.date.startsWith(selectedMonth);
  });

  const totalIncome = filteredTransactions.reduce((sum, t) => t.amount > 0 ? sum + Number(t.amount) : sum, 0);
  const totalExpense = filteredTransactions.reduce((sum, t) => t.amount < 0 ? sum + Math.abs(Number(t.amount)) : sum, 0);
  const netBalance = totalIncome - totalExpense;

  const selectedYear = selectedMonth ? selectedMonth.split('-')[0] : format(new Date(), 'yyyy');
  const yearlyTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedYear));

  const getMonthlyChartData = () => {
    const dataMap = {
      'Jan': { name: 'Jan', Income: 0, Expense: 0 },
      'Feb': { name: 'Feb', Income: 0, Expense: 0 },
      'Mar': { name: 'Mar', Income: 0, Expense: 0 },
      'Apr': { name: 'Apr', Income: 0, Expense: 0 },
      'May': { name: 'May', Income: 0, Expense: 0 },
      'Jun': { name: 'Jun', Income: 0, Expense: 0 },
      'Jul': { name: 'Jul', Income: 0, Expense: 0 },
      'Aug': { name: 'Aug', Income: 0, Expense: 0 },
      'Sep': { name: 'Sep', Income: 0, Expense: 0 },
      'Oct': { name: 'Oct', Income: 0, Expense: 0 },
      'Nov': { name: 'Nov', Income: 0, Expense: 0 },
      'Dec': { name: 'Dec', Income: 0, Expense: 0 }
    };
    yearlyTransactions.forEach(t => {
      const monthIndex = parseInt(t.date.split('-')[1], 10) - 1;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mName = monthNames[monthIndex];
      if (!mName) return;
      const amt = Number(t.amount);
      if (amt > 0) dataMap[mName].Income += amt;
      else dataMap[mName].Expense += Math.abs(amt);
    });
    return Object.values(dataMap);
  };

  const getWeeklyChartData = () => {
    const dataMap = {
      'Week 1': { name: 'Week 1', Income: 0, Expense: 0 },
      'Week 2': { name: 'Week 2', Income: 0, Expense: 0 },
      'Week 3': { name: 'Week 3', Income: 0, Expense: 0 },
      'Week 4': { name: 'Week 4', Income: 0, Expense: 0 },
      'Week 5': { name: 'Week 5', Income: 0, Expense: 0 }
    };
    filteredTransactions.forEach(t => {
      const day = parseInt(t.date.split('-')[2], 10);
      let weekStr = 'Week 5';
      if (day <= 7) weekStr = 'Week 1';
      else if (day <= 14) weekStr = 'Week 2';
      else if (day <= 21) weekStr = 'Week 3';
      else if (day <= 28) weekStr = 'Week 4';
      
      const amt = Number(t.amount);
      if (amt > 0) dataMap[weekStr].Income += amt;
      else dataMap[weekStr].Expense += Math.abs(amt);
    });
    return Object.values(dataMap);
  };

  const chartData = timeView === 'monthly' ? getMonthlyChartData() : getWeeklyChartData();

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{t('Dashboard')}</h1>
          <p>View and manage transactions</p>
        </div>
        
        <div className="flex-actions">
          {/* Workspace Switcher */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
            <User size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <select
              className="form-input"
              style={{ paddingLeft: '35px', margin: 0, height: '40px', minWidth: '220px', cursor: 'pointer' }}
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              onClick={refreshWorkspaces}
            >
              <option value={user.id}>My Workspace ({user.username})</option>
              {sharedWorkspaces.map(w => (
                <option key={w.id} value={w.id}>{w.username}'s Workspace</option>
              ))}
            </select>
          </div>

          <button className="btn btn-outline" onClick={() => exportToPDF(filteredTransactions)} disabled={!activeWorkspaceId}>
            <FileDown size={18} /> PDF
          </button>
          <button className="btn btn-outline" onClick={() => exportToExcel(filteredTransactions)} disabled={!activeWorkspaceId}>
            <FileDown size={18} /> Excel
          </button>
          {activeWorkspaceId === user.id && (
            <button className="btn btn-primary" onClick={() => {
              setFormData({ date: '', day: '', reason: '', amount: '', type: 'expense' });
              setEditingId(null);
              setShowModal(true);
            }} disabled={!activeWorkspaceId}>
              <Plus size={18} /> {t('Add Transaction')}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1))' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '12px' }}>
            <Activity size={32} color="var(--success)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Income</p>
            <h2 style={{ margin: '0.25rem 0 0 0', color: 'var(--success)', fontSize: '2rem' }}>₹{totalIncome.toFixed(2)}</h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.1))' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px' }}>
            <Calendar size={32} color="var(--danger)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Expense</p>
            <h2 style={{ margin: '0.25rem 0 0 0', color: 'var(--danger)', fontSize: '2rem' }}>₹{totalExpense.toFixed(2)}</h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '12px' }}>
            <Wallet size={32} color="var(--primary-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Net Balance</p>
            <h2 style={{ margin: '0.25rem 0 0 0', color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '2rem' }}>₹{netBalance.toFixed(2)}</h2>
          </div>
        </div>

      </div>

      {/* Cash Flow Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="filter-header" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Cash Flow Overview</h3>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.25rem', borderRadius: '8px' }}>
             <button className={`btn ${timeView === 'weekly' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 1rem', background: timeView === 'weekly' ? 'var(--primary-color)' : 'transparent', border: 'none', color: timeView === 'weekly' ? '#fff' : 'var(--text-main)' }} onClick={() => setTimeView('weekly')}>Weekly</button>
             <button className={`btn ${timeView === 'monthly' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 1rem', background: timeView === 'monthly' ? 'var(--primary-color)' : 'transparent', border: 'none', color: timeView === 'monthly' ? '#fff' : 'var(--text-main)' }} onClick={() => setTimeView('monthly')}>Monthly</button>
          </div>
        </div>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tickMargin={10} />
              <YAxis stroke="var(--text-muted)" tickFormatter={(val) => `₹${val}`} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} itemStyle={{ color: 'var(--text-main)' }} />
              <Legend verticalAlign="bottom" height={36}/>
              <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="filter-header">
          <h3 style={{ margin: 0 }}>
            {t('Transactions')} {activeWorkspaceId !== user.id && `- ${sharedWorkspaces.find(w => w.id === activeWorkspaceId)?.username}`}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filter by Month:</span>
             <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="month" 
                  className="form-input" 
                  style={{ paddingLeft: '35px', margin: 0, height: '40px', minWidth: '150px' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
             </div>
             {selectedMonth && (
               <button 
                 className="btn btn-outline" 
                 style={{ padding: '0.4rem 0.8rem', height: '40px' }} 
                 onClick={() => setSelectedMonth('')}
               >
                 Show All
               </button>
             )}
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('Date')}</th>
                <th>{t('Day')}</th>
                <th>{t('Type')}</th>
                <th>{t('Reason')}</th>
                <th>{t('Amount')}</th>
                {activeWorkspaceId === user.id && <th>{t('Action')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={activeWorkspaceId === user.id ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.day}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem', 
                        background: t.amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: t.amount > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {t.amount > 0 ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td>{t.reason}</td>
                    <td style={{ fontWeight: '600', color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {t.amount > 0 ? '+' : '-'}₹{Math.abs(Number(t.amount)).toFixed(2)}
                    </td>
                    {activeWorkspaceId === user.id && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'transparent' }} onClick={() => handleEdit(t)}>
                            <Edit size={14} /> Edit
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal overlay */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Transaction' : t('Add Transaction')}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">{t('Date')}</label>
                <input type="date" className="form-input" required value={formData.date} onChange={e => {
                  const date = e.target.value;
                  const day = date ? format(new Date(date), 'EEEE') : '';
                  setFormData({...formData, date, day});
                }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Day')}</label>
                <input type="text" className="form-input" required value={formData.day} readOnly style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Type')}</label>
                <select className="form-input" required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Reason')}</label>
                <input type="text" className="form-input" required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Amount')}</label>
                <input type="number" step="0.01" className="form-input" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Record' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
