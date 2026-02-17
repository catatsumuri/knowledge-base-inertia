import {
    AlertCircle,
    ArrowRight,
    ArrowLeftRight,
    Award,
    Bell,
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    Columns3,
    Code,
    Database,
    Download,
    Eye,
    ExternalLink,
    Filter,
    FileCode,
    Flag,
    Folder,
    Frame,
    GitBranch,
    HelpCircle,
    Info,
    Link,
    LayoutGrid,
    Leaf,
    Lock,
    Mail,
    MessageCircle,
    MessageSquareWarning,
    Mouse,
    PanelRight,
    Palette,
    RefreshCw,
    Rocket,
    Search,
    Settings,
    Smile,
    Square,
    Sparkles,
    TextCursorInput,
    Timer,
    Upload,
    User,
    Users,
    XCircle,
    Zap,
    ListOrdered,
    ChevronDown,
    ChevronsDown,
    type LucideIcon,
} from 'lucide-react';

/**
 * アイコン名（小文字、ケバブケース、パスカルケース対応）からLucideIconコンポーネントへのマッピング
 */
const ICON_MAP: Record<string, LucideIcon> = {
    // 時計・時間関連
    clock: Clock,
    timer: Timer,

    // アクション・動作
    rocket: Rocket,
    refresh: RefreshCw,
    mouse: Mouse,
    zap: Zap,

    // セキュリティ
    lock: Lock,

    // その他よく使われるアイコン
    brain: Brain,
    sparkles: Sparkles,
    'arrow-right': ArrowRight,
    arrowright: ArrowRight,

    // 状態表示
    info: Info,
    'alert-circle': AlertCircle,
    alertcircle: AlertCircle,
    'check-circle': CheckCircle,
    checkcircle: CheckCircle,
    'x-circle': XCircle,
    xcircle: XCircle,
    'help-circle': HelpCircle,
    helpcircle: HelpCircle,

    // ファイル・データ
    code: Code,
    database: Database,
    'file-code': FileCode,
    filecode: FileCode,
    folder: Folder,
    frame: Frame,

    // UI要素
    settings: Settings,
    user: User,
    users: Users,
    mail: Mail,
    bell: Bell,
    calendar: Calendar,
    search: Search,
    filter: Filter,
    eye: Eye,
    square: Square,
    'layout-grid': LayoutGrid,
    layoutgrid: LayoutGrid,
    leaf: Leaf,
    'columns-3': Columns3,
    columns3: Columns3,
    'panel-right': PanelRight,
    panelright: PanelRight,
    'list-ordered': ListOrdered,
    listordered: ListOrdered,
    'chevron-down': ChevronDown,
    chevrondown: ChevronDown,
    'chevrons-down': ChevronsDown,
    chevronsdown: ChevronsDown,

    // リンク・アップロード
    download: Download,
    upload: Upload,
    'external-link': ExternalLink,
    externallink: ExternalLink,
    link: Link,

    // コミュニケーション・装飾
    'message-circle': MessageCircle,
    messagecircle: MessageCircle,
    'message-square-warning': MessageSquareWarning,
    messagesquarewarning: MessageSquareWarning,
    flag: Flag,
    award: Award,
    smile: Smile,

    // 構造・ナビゲーション
    'git-branch': GitBranch,
    gitbranch: GitBranch,
    'arrow-left-right': ArrowLeftRight,
    arrowleftright: ArrowLeftRight,
    'text-cursor-input': TextCursorInput,
    textcursorinput: TextCursorInput,
    palette: Palette,
};

/**
 * アイコン名から対応するLucideIconコンポーネントを取得
 *
 * @param iconName - アイコン名（小文字推奨、ケバブケースまたはパスカルケース）
 * @returns LucideIconコンポーネント、または見つからない場合はundefined
 *
 * @example
 * getLucideIcon('clock') // Clock
 * getLucideIcon('arrow-right') // ArrowRight
 * getLucideIcon('invalid') // undefined
 */
export function getLucideIcon(
    iconName: string | undefined,
): LucideIcon | undefined {
    if (!iconName) {
        return undefined;
    }

    // 小文字に正規化
    const normalizedName = iconName.toLowerCase().trim();

    return ICON_MAP[normalizedName];
}

/**
 * サポートされているアイコン名のリストを取得
 */
export function getSupportedIconNames(): string[] {
    return Object.keys(ICON_MAP).filter((key) => !key.includes('-')); // ケバブケースのエイリアスを除外
}
