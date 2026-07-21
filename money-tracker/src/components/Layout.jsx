import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutDashboard, WalletCards, Users, X } from 'lucide-react';
import { mockBackend } from '../lib/mockBackend';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [showShareModal, setShowShareModal] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [sharingList, setSharingList] = useState([]);
  const [shareError, setShareError] = useState('');
  const [isShareLoading, setIsShareLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const loadSharingList = async () => {
    try {
      const list = await mockBackend.getSharingList();
      setSharingList(list);
    } catch (err) {
      console.error("Failed to load sharing list", err);
    }
  };

  useEffect(() => {
    if (showShareModal) {
      loadSharingList();
      setShareError('');
    }
  }, [showShareModal]);

  const handleShare = async (e) => {
    e.preventDefault();
    setShareError('');
    setIsShareLoading(true);
    try {
      const updatedList = await mockBackend.shareWorkspace(targetUser);
      setSharingList(updatedList);
      setTargetUser('');
    } catch (err) {
      setShareError(err.message || 'Failed to share');
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleUnshare = async (targetId) => {
    if (!window.confirm('Are you sure you want to revoke access?')) return;
    try {
      const updatedList = await mockBackend.unshareWorkspace(targetId);
      setSharingList(updatedList);
    } catch (err) {
      console.error('Failed to revoke access', err);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel" style={{ margin: '1rem', height: 'calc(100vh - 2rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
            <WalletCards size={24} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Tracker</h3>
        </div>

        {/* User Info & Left Corner ID requirement */}
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as</p>
          <p style={{ margin: '0.25rem 0', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</p>
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--primary-color)', wordBreak: 'break-all' }}>
            <strong>Your UID:</strong> {user?.id}
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div 
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            <LayoutDashboard size={20} />
            <span style={{ fontWeight: 500 }}>{t('Dashboard')}</span>
          </div>

          <div 
            onClick={() => setShowShareModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            <Users size={20} />
            <span style={{ fontWeight: 500 }}>Share Access</span>
          </div>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <select className="form-input" onChange={changeLanguage} value={i18n.language}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
          
          <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={18} /> {t('Logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Share Modal overlay */}
      {showShareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowShareModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
              <Users size={24} color="var(--primary-color)" /> Share Workspace
            </h2>
            
            {shareError && (
              <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                {shareError}
              </div>
            )}
            
            <form onSubmit={handleShare} style={{ marginBottom: '2rem' }}>
              <label className="form-label">Authorize another user (Email or UID)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. user@example.com or google-1234" 
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={isShareLoading} style={{ padding: '0 1.25rem', whiteSpace: 'nowrap' }}>
                  {isShareLoading ? 'Adding...' : 'Share'}
                </button>
              </div>
            </form>
            
            <div>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Who can see your data</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sharingList.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No users have access to your workspace yet.</p>
                ) : (
                  sharingList.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '1rem' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.95rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u.id}</span>
                      </div>
                      <button 
                        onClick={() => handleUnshare(u.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
