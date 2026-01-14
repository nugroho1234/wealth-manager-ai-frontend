import { ReactNode } from 'react';

export const metadata = {
  title: 'Meeting Tracker - Virtual Wealth Manager',
  description: 'Track and manage your meetings effectively',
};

export default function MeetingTrackerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
