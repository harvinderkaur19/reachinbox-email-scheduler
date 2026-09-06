import { useState, useEffect, useCallback } from 'react';
import { UserProfile, EmailItem, ScheduleEmailInput } from './types/email';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { API_BASE_URL } from './config';
import { getScheduledEmails, getSentEmails, searchEmails, scheduleEmails, ApiError } from './services/emailService';
import { Loader2 } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeNav, setActiveNav] = useState<'scheduled' | 'sent'>('scheduled');
  const [view, setView] = useState<'dashboard' | 'compose' | 'detail'>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  
  // Real Backend Email Data & Pagination State
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [isFetchingEmails, setIsFetchingEmails] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Verify active application session on startup via GET /api/auth/me
  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload.success && payload.data?.user) {
            setUser(payload.data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to verify authentication session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthSession();
  }, []);

  // Fetch real email list & pagination totals from backend
  const loadDashboardData = useCallback(async (targetNav: 'scheduled' | 'sent') => {
    setIsFetchingEmails(true);
    setFetchError(null);

    try {
      if (targetNav === 'scheduled') {
        const scheduledData = await getScheduledEmails(1, 20);
        setEmails(scheduledData.emails);
        setScheduledCount(scheduledData.pagination.total);

        // Fetch sent count in background to keep sidebar counts accurate
        getSentEmails(1, 1)
          .then((d) => setSentCount(d.pagination.total))
          .catch(() => {});
      } else {
        const sentData = await getSentEmails(1, 20);
        setEmails(sentData.emails);
        setSentCount(sentData.pagination.total);

        // Fetch scheduled count in background to keep sidebar counts accurate
        getScheduledEmails(1, 1)
          .then((d) => setScheduledCount(d.pagination.total))
          .catch(() => {});
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        // Handle 401 by clearing authenticated user state
        setUser(null);
      } else {
        setFetchError(err.message || 'Failed to load emails from backend');
      }
    } finally {
      setIsFetchingEmails(false);
    }
  }, []);

  // Execute Elasticsearch search with query
  const executeSearch = useCallback(async (query: string) => {
    setIsFetchingEmails(true);
    setFetchError(null);

    try {
      const searchData = await searchEmails(query);
      setEmails(searchData.emails || []);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        setFetchError(err.message || 'Search service is currently unavailable');
      }
    } finally {
      setIsFetchingEmails(false);
    }
  }, []);

  // Debounced search effect (250–300 ms using setTimeout / clearTimeout)
  useEffect(() => {
    if (!user || view !== 'dashboard') return;

    const q = searchQuery.trim();
    if (!q) {
      // Empty query: load normal active Scheduled / Sent list
      loadDashboardData(activeNav);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(q);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user, activeNav, view, loadDashboardData, executeSearch]);

  const handleRefresh = () => {
    if (user) {
      const q = searchQuery.trim();
      if (q) {
        executeSearch(q);
      } else {
        loadDashboardData(activeNav);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout API request:', error);
    } finally {
      setUser(null);
      setView('dashboard');
    }
  };

  const handleNavigate = (nav: 'scheduled' | 'sent') => {
    setActiveNav(nav);
    setView('dashboard');
    setSelectedEmail(null);
  };

  const handleOpenCompose = () => {
    setView('compose');
  };

  const handleSelectEmail = (email: EmailItem) => {
    setSelectedEmail(email);
    setView('detail');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedEmail(null);
  };

  const handleToggleStar = (emailId: string) => {
    setEmails(
      emails.map((e) => (e.id === emailId ? { ...e, isStarred: !e.isStarred } : e))
    );
  };

  const handleSubmitSchedule = async (payload: ScheduleEmailInput) => {
    try {
      await scheduleEmails(payload);
      setActiveNav('scheduled');
      setView('dashboard');
      loadDashboardData('scheduled');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
      throw err;
    }
  };

  // 1. Loading state view
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-gray-600 font-sans select-none">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-tight text-gray-700">
          Loading ReachInbox workspace...
        </p>
      </div>
    );
  }

  // 2. Render Login Screen if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // 3. Render Compose View
  if (view === 'compose') {
    return (
      <ComposePage
        user={user}
        activeNav={activeNav}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={handleNavigate}
        onOpenCompose={handleOpenCompose}
        onBack={handleBackToDashboard}
        onSubmitSchedule={handleSubmitSchedule}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Render Email Detail View
  if (view === 'detail' && selectedEmail) {
    return (
      <EmailDetailPage
        user={user}
        activeNav={activeNav}
        email={selectedEmail}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={handleNavigate}
        onOpenCompose={handleOpenCompose}
        onBack={handleBackToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Default: Render Dashboard View (Scheduled or Sent)
  return (
    <DashboardPage
      user={user}
      activeNav={activeNav}
      emails={emails}
      scheduledCount={scheduledCount}
      sentCount={sentCount}
      searchQuery={searchQuery}
      isFetching={isFetchingEmails}
      fetchError={fetchError}
      onSearchChange={setSearchQuery}
      onNavigate={handleNavigate}
      onOpenCompose={handleOpenCompose}
      onSelectEmail={handleSelectEmail}
      onToggleStar={handleToggleStar}
      onRefresh={handleRefresh}
      onLogout={handleLogout}
    />
  );
}

export default App;
