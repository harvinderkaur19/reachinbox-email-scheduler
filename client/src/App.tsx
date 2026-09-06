import { useState } from 'react';
import { UserProfile, EmailItem } from './types/email';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';

// Static User Profile
const MOCK_USER: UserProfile = {
  id: 'dev-user-phase5a',
  name: 'Harvinder Kaur',
  email: 'harvinder@reachinbox.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
};

// Static Realistic Email Mock Data for Visual Rendering
const INITIAL_MOCK_EMAILS: EmailItem[] = [
  {
    id: 'email-101',
    campaignId: 'campaign-1',
    recipientEmail: 'alpha.finance@acme.com',
    subject: 'Q4 Product Release & Revenue Forecast',
    body: 'Hi team, here is the upcoming schedule and financial projections for the Q4 product release.',
    status: 'SCHEDULED',
    scheduledAt: 'Sep 7, 2026 10:00 AM',
    createdAt: '2026-09-06T12:00:00.000Z',
    isStarred: true,
  },
  {
    id: 'email-102',
    campaignId: 'campaign-1',
    recipientEmail: 'beta.marketing@acme.com',
    subject: 'Social Media Campaign Brief & Asset Guide',
    body: 'Attached is the design kit and copy brief for the upcoming social media launch.',
    status: 'SCHEDULED',
    scheduledAt: 'Sep 7, 2026 10:15 AM',
    createdAt: '2026-09-06T12:00:00.000Z',
    isStarred: false,
  },
  {
    id: 'email-103',
    campaignId: 'campaign-2',
    recipientEmail: 'charlie.engineering@acme.com',
    subject: 'API Integration Specifications & Rate Limit Guidelines',
    body: 'Please review the Redis atomic reservation script and BullMQ delayed job configuration.',
    status: 'SCHEDULED',
    scheduledAt: 'Sep 7, 2026 11:30 AM',
    createdAt: '2026-09-06T13:00:00.000Z',
    isStarred: false,
  },
  {
    id: 'email-201',
    campaignId: 'campaign-0',
    recipientEmail: 'executive.board@acme.com',
    subject: 'Monthly Email Deliverability & Performance Analytics',
    body: 'All system checks passed cleanly. Nodemailer Ethereal SMTP delivery metrics are green.',
    status: 'SENT',
    scheduledAt: 'Sep 6, 2026 09:00 AM',
    sentAt: 'Sep 6, 2026 09:00 AM',
    createdAt: '2026-09-06T09:00:00.000Z',
    isStarred: true,
  },
  {
    id: 'email-202',
    campaignId: 'campaign-0',
    recipientEmail: 'support.lead@acme.com',
    subject: 'Customer Onboarding Sequence — Welcome Email',
    body: 'Welcome to ReachInbox! Your automated email scheduler workspace is ready.',
    status: 'SENT',
    scheduledAt: 'Sep 6, 2026 09:30 AM',
    sentAt: 'Sep 6, 2026 09:30 AM',
    createdAt: '2026-09-06T09:30:00.000Z',
    isStarred: false,
  },
  {
    id: 'email-203',
    campaignId: 'campaign-0',
    recipientEmail: 'invalid.test.user@nonexistent-domain.com',
    subject: 'System Test Email Dispatch',
    body: 'Attempting delivery to test recipient endpoint.',
    status: 'FAILED',
    scheduledAt: 'Sep 6, 2026 10:00 AM',
    sentAt: null,
    failureReason: '550 5.1.1 User unknown',
    createdAt: '2026-09-06T10:00:00.000Z',
    isStarred: false,
  },
];

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeNav, setActiveNav] = useState<'scheduled' | 'sent'>('scheduled');
  const [view, setView] = useState<'dashboard' | 'compose' | 'detail'>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>(INITIAL_MOCK_EMAILS);

  // Navigation handlers
  const handleLogin = () => {
    setIsAuthenticated(true);
    setView('dashboard');
    setActiveNav('scheduled');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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

  const handleSubmitSend = (data: any) => {
    const newEmail: EmailItem = {
      id: `email-${Date.now()}`,
      campaignId: `campaign-${Date.now()}`,
      recipientEmail: data.recipients.join(', ') || 'recipient@example.com',
      subject: data.subject || 'Untitled Email',
      body: data.body || '',
      status: 'SCHEDULED',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toLocaleString() : 'Just now',
      createdAt: new Date().toISOString(),
      isStarred: false,
    };

    setEmails([newEmail, ...emails]);
    setActiveNav('scheduled');
    setView('dashboard');
  };

  // 1. Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  // Calculate counts for sidebar badges
  const scheduledCount = emails.filter((e) => e.status === 'SCHEDULED').length;
  const sentCount = emails.filter((e) => e.status === 'SENT' || e.status === 'FAILED').length;

  // 2. Render Compose View
  if (view === 'compose') {
    return (
      <ComposePage
        user={MOCK_USER}
        activeNav={activeNav}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={handleNavigate}
        onOpenCompose={handleOpenCompose}
        onBack={handleBackToDashboard}
        onSubmitSend={handleSubmitSend}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Render Email Detail View
  if (view === 'detail' && selectedEmail) {
    return (
      <EmailDetailPage
        user={MOCK_USER}
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

  // 4. Default: Render Dashboard View (Scheduled or Sent)
  return (
    <DashboardPage
      user={MOCK_USER}
      activeNav={activeNav}
      emails={emails}
      scheduledCount={scheduledCount}
      sentCount={sentCount}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigate={handleNavigate}
      onOpenCompose={handleOpenCompose}
      onSelectEmail={handleSelectEmail}
      onToggleStar={handleToggleStar}
      onLogout={handleLogout}
    />
  );
}

export default App;
