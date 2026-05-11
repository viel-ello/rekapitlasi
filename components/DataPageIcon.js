'use client';

import {
  BookOpen,
  ClipboardList,
  Heart,
  Shield,
  Swatchbook,
  UserCircle,
  Users,
} from 'flowbite-react-icons/outline';

const ICONS = {
  BookOpen,
  ClipboardList,
  Heart,
  Shield,
  Swatchbook,
  UserCircle,
  Users,
};

export function DataPageIcon({ name, className = 'w-6 h-6' }) {
  const Icon = ICONS[name] || ClipboardList;
  return <Icon className={className} />;
}
