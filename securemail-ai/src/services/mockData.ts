
import { Email, EmailLabel, StatData, AccuracyData } from '../types';

const SENDERS = [
  { name: 'HR Department', email: 'hr@internal-corp.com', label: EmailLabel.WORK },
  { name: 'Security Alert', email: 'security@verify-account-update.com', label: EmailLabel.PHISHING },
  { name: 'Amazon Deals', email: 'store-news@amazon.com', label: EmailLabel.PROMOTION },
  { name: 'Mom', email: 'mom.loves.cats@gmail.com', label: EmailLabel.PERSONAL },
  { name: 'Lottery Winner', email: 'admin@lucky-global-prizes.net', label: EmailLabel.SPAM },
  { name: 'Project Manager', email: 'pm@tech-startup.io', label: EmailLabel.WORK },
  { name: 'LinkedIn', email: 'notifications@linkedin.com', label: EmailLabel.SOCIAL },
  { name: 'Netflix', email: 'info@mailer.netflix.com', label: EmailLabel.PROMOTION },
  { name: 'CEO', email: 'ceo-urgent-task@fake-corp-mail.com', label: EmailLabel.PHISHING },
  { name: 'Gym Buddy', email: 'jason.fitness@gmail.com', label: EmailLabel.PERSONAL },
];

const SUBJECTS = {
  [EmailLabel.WORK]: ['Q4 Report', 'Meeting Notes', 'Project Update', 'Code Review', 'Design Sync', 'Budget Approval'],
  [EmailLabel.PERSONAL]: ['Dinner tonight?', 'Weekend trip', 'Happy Birthday!', 'Can you call me?', 'Recipe attached'],
  [EmailLabel.PHISHING]: ['URGENT: Password Expired', 'Verify your identity', 'Suspicious Login Attempt', 'CEO needs help', 'Invoice #9999 Overdue'],
  [EmailLabel.PROMOTION]: ['20% Off Everything', 'Black Friday Sale', 'Your Wishlist is on sale', 'New Arrivals', 'Exclusive Offer'],
  [EmailLabel.SPAM]: ['You won $1,000,000', 'Cheap Meds Online', 'Lose weight fast', 'Hot Singles nearby', 'Crypto Investment'],
  [EmailLabel.SOCIAL]: ['New connection request', 'Someone viewed your profile', 'Trending post', 'Friend suggestion'],
  [EmailLabel.GAME]: ['New High Score', 'Steam Sale', 'Battle Pass Update', 'Login Verification', 'Game Release'],
  [EmailLabel.EDUCATION]: ['Assignment Due', 'Course Update', 'Weekly Progress', 'New Material', 'Class Cancelled'],
};

// HTML Template for Duolingo-style email
const DUOLINGO_HTML = `
<div style="font-family: 'Nunito', sans-serif; color: #4b4b4b; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
  <div style="margin-bottom: 30px;">
    <h1 style="color: #58cc02; font-size: 24px; font-weight: 800;">Practice makes progress!</h1>
    <p style="font-size: 16px; color: #777;">Hi Alex, keep your streak alive!</p>
  </div>
  
  <div style="margin-bottom: 40px;">
    <img src="https://design.duolingo.com/images/mascot-standard-happy.svg" alt="Duo" style="width: 150px; height: auto;" />
  </div>

  <div style="background-color: #fff; border: 2px solid #e5e5e5; border-radius: 16px; padding: 24px; margin-bottom: 30px; text-align: left;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
      <span style="font-weight: bold; font-size: 18px;">Current Streak</span>
      <span style="background: #ff9600; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">🔥 42 Days</span>
    </div>
    <div style="height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden;">
      <div style="width: 80%; height: 100%; background: #58cc02;"></div>
    </div>
    <p style="margin-top: 10px; color: #777; font-size: 14px;">You're crushing it! 50 day goal is in sight.</p>
  </div>

  <a href="#" style="display: inline-block; background-color: #58cc02; color: white; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 0 #46a302; transition: transform 0.1s;">
    CONTINUE LEARNING
  </a>

  <div style="margin-top: 40px; border-top: 2px solid #f7f7f7; padding-top: 20px;">
    <p style="font-size: 12px; color: #afafaf;">
      You are receiving this email because you are subscribed to Duolingo updates.<br/>
      5900 Penn Ave, Pittsburgh PA 15206
    </p>
  </div>
</div>
`;

const generateMockEmails = (count: number): Email[] => {
  const emails = Array.from({ length: count }).map((_, i) => {
    const senderTemplate = SENDERS[Math.floor(Math.random() * SENDERS.length)];
    const label = senderTemplate.label; 
    const subjects = SUBJECTS[label] || ['Hello'];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    // Randomize time offset but keep within last 30 days
    const timeOffset = Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); 
    const isPhishing = label === EmailLabel.PHISHING;

    return {
      id: `mock-${i + 1}`,
      senderName: senderTemplate.name,
      senderEmail: senderTemplate.email,
      subject: subject,
      preview: `This is a generated preview content for email #${i + 1}...`,
      body: `Hi there,\n\nThis is the standard text body for email ID ${i + 1}.\n\nIt is a ${label} email.\n\nBest,\n${senderTemplate.name}`,
      date: new Date(Date.now() - timeOffset).toISOString(),
      label: label,
      confidenceScore: isPhishing ? 0.95 : Math.random() * 0.4 + 0.5, 
      isRead: Math.random() > 0.3,
      isStarred: Math.random() > 0.8,
      warnings: isPhishing ? ['Suspicious sender domain', 'Urgent language detected', 'Malicious link pattern'] : [],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderTemplate.name)}&background=random&color=fff`
    };
  });

  // Inject the HTML email at the top, make it VERY recent (e.g. 5 mins ago)
  emails.push({
    id: 'mock-html-1',
    senderName: 'Duolingo',
    senderEmail: 'hello@duolingo.com',
    subject: 'Hi Alex, here’s your daily Korean reminder!',
    preview: 'Practice makes progress! Hi Alex, keep your streak alive...',
    body: DUOLINGO_HTML,
    date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    label: EmailLabel.EDUCATION,
    confidenceScore: 0.99,
    isRead: false,
    isStarred: true,
    warnings: [],
    avatar: 'https://design.duolingo.com/images/mascot-standard-happy.svg'
  });

  // Sort Descending by Date to ensure Newest on Top
  return emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const mockEmails: Email[] = generateMockEmails(50);

export const mockStats: StatData[] = [
  { name: 'Work', value: 0, fill: '#3b82f6' },
  { name: 'Personal', value: 0, fill: '#22c55e' },
  { name: 'Promo', value: 0, fill: '#eab308' },
  { name: 'Spam', value: 0, fill: '#f97316' },
  { name: 'Phishing', value: 0, fill: '#ef4444' },
];

export const mockAccuracy: AccuracyData[] = [
  { day: 'Mon', accuracy: 88 },
  { day: 'Tue', accuracy: 89 },
  { day: 'Wed', accuracy: 91 },
  { day: 'Thu', accuracy: 92 },
  { day: 'Fri', accuracy: 94 },
  { day: 'Sat', accuracy: 93 },
  { day: 'Sun', accuracy: 96 },
];
