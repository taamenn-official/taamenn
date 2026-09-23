import {
  Activity,
  AlertTriangle,
  Bell,
  Clock,
  Database,
  FileText,
  Lock,
  Mail,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  intro: Shield,
  collection: Database,
  storage: Lock,
  email: Mail,
  notifications: Bell,
  analytics: Activity,
  sharing: Users,
  featured: Users,
  security: Shield,
  deletion: Database,
  changes: Clock,
  'acceptable-use': Users,
  'user-responsibility': Shield,
  limitations: AlertTriangle,
  data: Database,
  updates: Clock,
};

export function legalSectionIcon(id: string): LucideIcon {
  return ICONS[id] ?? FileText;
}
