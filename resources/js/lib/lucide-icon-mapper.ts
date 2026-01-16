import {
    AlertCircle,
    ArrowRight,
    Bell,
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    Code,
    Database,
    Download,
    ExternalLink,
    Filter,
    HelpCircle,
    Info,
    Link,
    Lock,
    Mail,
    Mouse,
    RefreshCw,
    Rocket,
    Search,
    Settings,
    Sparkles,
    Timer,
    Upload,
    User,
    Users,
    XCircle,
    Zap,
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

    // UI要素
    settings: Settings,
    user: User,
    users: Users,
    mail: Mail,
    bell: Bell,
    calendar: Calendar,
    search: Search,
    filter: Filter,

    // リンク・アップロード
    download: Download,
    upload: Upload,
    'external-link': ExternalLink,
    externallink: ExternalLink,
    link: Link,
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
