import {
  BarChart3,
  Settings,
  MapPin,
  Clock,
  Check,
  CheckCircle,
  AlertTriangle,
  Camera,
  Video,
  Plus,
  PlusCircle,
  ArrowLeft,
  ChevronRight,
  XCircle,
  Wrench,
  Shield,
  ClipboardCheck,
  Upload,
  Download,
  Search,
  Filter,
  MoreVertical,
  FileText,
  AlertCircle,
  Timer,
  Building2,
  Gauge,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  Home,
  Package,
  FileCheck,
  UserCheck,
  Calendar,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Info,
  CheckSquare,
  Square,
  Activity,
  Loader2,
  Image,
  FileVideo,
  ExternalLink,
  Copy,
  Clipboard
} from 'lucide-react';

export const Icons = {
  // Navigation
  back: ArrowLeft,
  forward: ChevronRight,
  close: X,
  home: Home,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,

  // Actions
  add: Plus,
  addCircle: PlusCircle,
  edit: Edit,
  delete: Trash2,
  save: Save,
  copy: Copy,
  clipboard: Clipboard,
  externalLink: ExternalLink,

  // Status
  check: Check,
  checkCircle: CheckCircle,
  checkSquare: CheckSquare,
  square: Square,
  warning: AlertTriangle,
  error: XCircle,
  alert: AlertCircle,
  info: Info,

  // Features
  dashboard: BarChart3,
  settings: Settings,
  location: MapPin,
  time: Clock,
  timer: Timer,
  camera: Camera,
  video: Video,
  image: Image,
  fileVideo: FileVideo,
  calendar: Calendar,
  activity: Activity,

  // Equipment
  equipment: Building2,
  maintenance: Wrench,
  safety: Shield,
  inspection: ClipboardCheck,
  gauge: Gauge,
  tool: Wrench,
  package: Package,

  // UI
  upload: Upload,
  download: Download,
  search: Search,
  filter: Filter,
  menu: MoreVertical,
  document: FileText,
  fileCheck: FileCheck,
  view: Eye,
  userCheck: UserCheck,
  refresh: RefreshCw,
  play: PlayCircle,
  pause: PauseCircle,
  loader: Loader2,
};

// Consistent sizing classes
export const iconSizes = {
  xs: 'w-3 h-3',   // 12px
  sm: 'w-4 h-4',   // 16px
  md: 'w-5 h-5',   // 20px (default)
  lg: 'w-6 h-6',   // 24px
  xl: 'w-8 h-8',   // 32px
  '2xl': 'w-12 h-12', // 48px (touch target)
};

// Type for icon names
export type IconName = keyof typeof Icons;

// Helper function to get icon component
export function getIcon(name: IconName) {
  return Icons[name];
}