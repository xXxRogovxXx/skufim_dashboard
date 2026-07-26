import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime
import base64
from io import BytesIO
import tempfile
import os

# ============================================================
# КОНФИГУРАЦИЯ СТРАНИЦЫ
# ============================================================
st.set_page_config(
    layout="wide",
    page_title="Podcast Analytics",
    page_icon="🎙️"
)

# ============================================================
# CSS — СОВРЕМЕННЫЙ КОММЕРЧЕСКИЙ ДИЗАЙН
# ============================================================
st.markdown("""
<style>
    /* ------------------------------------------------
       БАЗА
    ------------------------------------------------ */
    * {
        box-sizing: border-box;
    }

    .stApp {
        background: #09090B;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* ------------------------------------------------
       ЗАГОЛОВКИ
    ------------------------------------------------ */
    .main-title {
        font-size: 2.8rem;
        font-weight: 700;
        color: #FAFAFA;
        letter-spacing: -0.02em;
        margin: 0 0 0.2rem 0;
        padding: 0;
    }

    .main-title span {
        background: linear-gradient(135deg, #FAFAFA 0%, #7C3AED 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .sub-title {
        color: #A1A1AA;
        font-size: 0.9rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        font-weight: 400;
        margin-bottom: 2rem;
    }

    .section-title {
        font-size: 1.4rem;
        font-weight: 600;
        color: #FAFAFA;
        letter-spacing: -0.01em;
        margin: 0 0 1rem 0;
        padding: 0 0 0.5rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        display: inline-block;
    }

    /* ------------------------------------------------
       GLASSMORPHISM КАРТОЧКИ
    ------------------------------------------------ */
    .glass {
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 24px;
        padding: 1.5rem;
        transition: all 0.25s ease;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .glass:hover {
        transform: scale(1.01);
        border-color: rgba(255, 255, 255, 0.10);
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
    }

    .glass-light {
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 20px;
        padding: 1.25rem;
        transition: all 0.25s ease;
    }

    .glass-light:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.08);
    }

    /* ------------------------------------------------
       KPI КАРТОЧКИ
    ------------------------------------------------ */
    .kpi-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 1.25rem 1rem;
        text-align: center;
        transition: all 0.25s ease;
        position: relative;
        overflow: hidden;
    }

    .kpi-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #7C3AED, #A78BFA);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .kpi-card:hover {
        transform: translateY(-2px) scale(1.01);
        border-color: rgba(255, 255, 255, 0.10);
        box-shadow: 0 8px 32px rgba(124, 58, 237, 0.08);
    }

    .kpi-card:hover::after {
        opacity: 1;
    }

    .kpi-icon {
        font-size: 1.4rem;
        display: block;
        margin-bottom: 0.3rem;
        opacity: 0.8;
    }

    .kpi-value {
        font-size: 2rem;
        font-weight: 700;
        color: #FAFAFA;
        letter-spacing: -0.01em;
        line-height: 1.2;
    }

    .kpi-label {
        color: #A1A1AA;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-top: 0.2rem;
        font-weight: 500;
    }

    .kpi-trend {
        display: inline-block;
        font-size: 0.7rem;
        padding: 0.1rem 0.5rem;
        border-radius: 12px;
        margin-top: 0.2rem;
        font-weight: 500;
    }

    .kpi-trend.up {
        color: #22C55E;
        background: rgba(34, 197, 94, 0.10);
    }

    .kpi-trend.down {
        color: #EF4444;
        background: rgba(239, 68, 68, 0.10);
    }

    /* ------------------------------------------------
       БЕЙДЖИ
    ------------------------------------------------ */
    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.15rem 0.6rem;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.06);
        color: #A1A1AA;
    }

    .badge-accent {
        background: rgba(124, 58, 237, 0.12);
        border-color: rgba(124, 58, 237, 0.20);
        color: #A78BFA;
    }

    .badge-green {
        background: rgba(34, 197, 94, 0.10);
        border-color: rgba(34, 197, 94, 0.15);
        color: #22C55E;
    }

    .badge-red {
        background: rgba(239, 68, 68, 0.10);
        border-color: rgba(239, 68, 68, 0.15);
        color: #EF4444;
    }

    /* ------------------------------------------------
       HINT / INFO
    ------------------------------------------------ */
    .hint {
        background: rgba(255, 255, 255, 0.02);
        border-left: 3px solid rgba(124, 58, 237, 0.4);
        border-radius: 0 8px 8px 0;
        padding: 0.6rem 1rem;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        color: #A1A1AA;
    }

    .hint strong {
        color: #A78BFA;
        font-weight: 600;
    }

    .hint span {
        color: #71717A;
        margin-left: 0.4rem;
    }

    /* ------------------------------------------------
       INFO БЛОК
    ------------------------------------------------ */
    .info-block {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 20px;
        padding: 1.5rem;
    }

    .info-block-title {
        color: #FAFAFA;
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.8rem;
    }

    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
    }

    .info-item-label {
        color: #7C3AED;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .info-item-desc {
        color: #71717A;
        font-size: 0.8rem;
    }

    /* ------------------------------------------------
       SIDEBAR
    ------------------------------------------------ */
    section[data-testid="stSidebar"] {
        background: rgba(9, 9, 11, 0.95) !important;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.04);
        padding: 1.5rem 0.5rem;
    }

    section[data-testid="stSidebar"] .stSelectbox label,
    section[data-testid="stSidebar"] .stDateInput label,
    section[data-testid="stSidebar"] .stRadio label {
        color: #A1A1AA !important;
        font-size: 0.75rem !important;
        font-weight: 500 !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    section[data-testid="stSidebar"] .stSelectbox div[data-baseweb="select"] {
        background: rgba(255, 255, 255, 0.04) !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
    }

    section[data-testid="stSidebar"] .stButton button {
        background: rgba(124, 58, 237, 0.12) !important;
        color: #A78BFA !important;
        border: 1px solid rgba(124, 58, 237, 0.15) !important;
        border-radius: 12px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
    }

    section[data-testid="stSidebar"] .stButton button:hover {
        background: rgba(124, 58, 237, 0.20) !important;
        border-color: rgba(124, 58, 237, 0.30) !important;
        transform: scale(1.02);
    }

    /* ------------------------------------------------
       EXPANDER
    ------------------------------------------------ */
    .stExpander {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        border-radius: 16px !important;
    }

    .stExpander summary p {
        color: #A78BFA !important;
        font-weight: 600 !important;
    }

    .stExpander summary svg {
        fill: #A78BFA !important;
    }

    /* ------------------------------------------------
       RADIO & SELECT
    ------------------------------------------------ */
    div[role="radiogroup"] label p {
        color: #A1A1AA !important;
        font-weight: 500 !important;
        font-size: 0.85rem !important;
    }

    div[role="radiogroup"] label[data-checked="true"] p {
        color: #FAFAFA !important;
    }

    /* ------------------------------------------------
       DATA FRAME
    ------------------------------------------------ */
    .stDataFrame {
        background: rgba(255, 255, 255, 0.02) !important;
        border-radius: 16px !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        overflow: hidden;
    }

    .stDataFrame thead th {
        color: #A1A1AA !important;
        font-weight: 500 !important;
        font-size: 0.7rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        background: rgba(255, 255, 255, 0.02) !important;
    }

    .stDataFrame tbody td {
        color: #FAFAFA !important;
        font-size: 0.85rem !important;
    }

    /* ------------------------------------------------
       FOOTER
    ------------------------------------------------ */
    .footer {
        text-align: center;
        color: rgba(255, 255, 255, 0.08);
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 2rem 0 1rem 0;
        border-top: 1px solid rgba(255, 255, 255, 0.03);
        margin-top: 2rem;
    }

    /* ------------------------------------------------
       IMPORTANT DATES LEGEND
    ------------------------------------------------ */
    .dates-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        align-items: center;
        padding: 0.6rem 1rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        margin-bottom: 1rem;
    }

    .dates-legend-label {
        color: #71717A;
        font-size: 0.7rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
    }

    .date-dot {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.1rem 0.6rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 20px;
        font-size: 0.75rem;
        color: #A1A1AA;
        border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .date-dot .dot {
        font-size: 1rem;
    }

    .date-dot .label {
        color: #FAFAFA;
    }

    .date-dot .date {
        color: #71717A;
        font-size: 0.65rem;
    }

    /* ------------------------------------------------
       VERDICT CARDS
    ------------------------------------------------ */
    .verdict {
        border-radius: 16px;
        padding: 1rem;
        text-align: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        transition: all 0.25s ease;
    }

    .verdict:hover {
        border-color: rgba(255, 255, 255, 0.08);
    }

    .verdict .title {
        font-weight: 600;
        font-size: 0.85rem;
    }

    .verdict .value {
        font-size: 1.2rem;
        font-weight: 700;
        margin-top: 0.2rem;
    }

    .verdict .desc {
        font-size: 0.75rem;
        color: #71717A;
        margin-top: 0.1rem;
    }

    /* ------------------------------------------------
       HALL OF FAME / DANGER ZONE
    ------------------------------------------------ */
    .hall-item {
        background: rgba(34, 197, 94, 0.04);
        border: 1px solid rgba(34, 197, 94, 0.10);
        border-radius: 14px;
        padding: 0.7rem 1rem;
        margin-bottom: 0.5rem;
        transition: all 0.2s ease;
    }

    .hall-item:hover {
        background: rgba(34, 197, 94, 0.08);
        border-color: rgba(34, 197, 94, 0.20);
        transform: translateX(4px);
    }

    .danger-item {
        background: rgba(239, 68, 68, 0.04);
        border: 1px solid rgba(239, 68, 68, 0.10);
        border-radius: 14px;
        padding: 0.7rem 1rem;
        margin-bottom: 0.5rem;
        transition: all 0.2s ease;
    }

    .danger-item:hover {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.20);
        transform: translateX(4px);
    }

    /* ------------------------------------------------
       METRIC CARD (для детальной страницы)
    ------------------------------------------------ */
    .metric-detail {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 0.8rem;
        text-align: center;
        transition: all 0.2s ease;
    }

    .metric-detail:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.08);
    }

    .metric-detail .label {
        color: #71717A;
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 500;
    }

    .metric-detail .value {
        color: #FAFAFA;
        font-weight: 700;
        font-size: 1.1rem;
        margin-top: 0.1rem;
    }

    /* ------------------------------------------------
       МЕДИА-ЗАПРОСЫ
    ------------------------------------------------ */
    @media (max-width: 768px) {
        .main-title { font-size: 2rem; }
        .kpi-value { font-size: 1.4rem; }
        .info-grid { grid-template-columns: 1fr; }
    }
    
</style>
""", unsafe_allow_html=True)

# ============================================================
# КОНСТАНТЫ
# ============================================================
IMPORTANT_DATES = {
    "2025-05-19": {"label": "🎤 Фичеринг 1", "color": "#7C3AED", "dash": "dash"},
    "2025-09-15": {"label": "🎤 Фичеринг 2", "color": "#7C3AED", "dash": "dot"},
}


# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================
def safe_div(a, b, default=0):
    """Безопасное деление для чисел и Series."""
    if isinstance(b, (int, float)):
        return a / b if b != 0 else default
    # Для pandas Series
    result = a / b
    result = result.fillna(default)
    result = result.replace([np.inf, -np.inf], default)
    return result


def format_number(n):
    """Форматирует число с разделителями тысяч."""
    return f"{n:,.0f}"


def format_percent(n):
    """Форматирует число как процент."""
    return f"{n:.1f}%"


def format_decimal(n, places=1):
    """Форматирует число с заданным количеством знаков."""
    return f"{n:.{places}f}"


# ============================================================
# UI ФУНКЦИИ
# ============================================================
def section_title(title):
    """Отрисовывает заголовок секции."""
    st.markdown(f'<div class="section-title">{title}</div>', unsafe_allow_html=True)


def show_hint(emoji, title, text):
    """Отрисовывает подсказку."""
    st.markdown(f"""
    <div class="hint">
        <strong>{emoji} {title}</strong>
        <span>— {text}</span>
    </div>
    """, unsafe_allow_html=True)


def create_metric_row(metrics):
    """Создает ряд KPI-карточек."""
    normalized = []
    for m in metrics:
        if len(m) == 3:
            normalized.append((m[0], m[1], m[2], None, None))
        elif len(m) == 4:
            normalized.append((m[0], m[1], m[2], m[3], None))
        else:
            normalized.append(m)

    cols = st.columns(len(normalized))
    for col, (icon, value, label, trend, trend_label) in zip(cols, normalized):
        trend_html = ""
        if trend is not None:
            cls = "up" if trend > 0 else "down"
            sign = "+" if trend > 0 else ""
            trend_html = f'<div class="kpi-trend {cls}">{sign}{trend:.1f}% {trend_label or ""}</div>'
        col.markdown(f"""
        <div class="kpi-card">
            <span class="kpi-icon">{icon}</span>
            <div class="kpi-value">{value}</div>
            <div class="kpi-label">{label}</div>
            {trend_html}
        </div>
        """, unsafe_allow_html=True)


def colored_badge(text, color="accent"):
    """Создает цветной бейдж."""
    colors = {
        "accent": "badge-accent",
        "green": "badge-green",
        "red": "badge-red",
    }
    cls = colors.get(color, "badge-accent")
    return f'<span class="badge {cls}">{text}</span>'


def glass_container(content_func, *args, **kwargs):
    """Обертка для стеклянного контейнера."""
    st.markdown('<div class="glass">', unsafe_allow_html=True)
    content_func(*args, **kwargs)
    st.markdown('</div>', unsafe_allow_html=True)


def important_dates_legend():
    """Показывает легенду важных дат."""
    if not IMPORTANT_DATES:
        return

    html = '<div class="dates-legend">'
    html += '<span class="dates-legend-label">📅 Важные даты</span>'

    for date_str, props in IMPORTANT_DATES.items():
        date_obj = pd.to_datetime(date_str)
        # УБЕРИ ВСЕ ПЕРЕНОСЫ СТРОК ВНУТРИ СПАНА!
        html += f'<span class="date-dot"><span class="dot" style="color:{props["color"]};">●</span><span class="label">{props["label"]}</span><span class="date">{date_obj.strftime("%d.%m.%Y")}</span></span>'

    html += '</div>'

    # ОБЯЗАТЕЛЬНО unsafe_allow_html=True
    st.markdown(html, unsafe_allow_html=True)


def add_important_dates_to_fig(fig):
    """Добавляет важные даты на график."""
    for date_str, props in IMPORTANT_DATES.items():
        try:
            fig.add_vline(
                x=pd.to_datetime(date_str),
                line_dash=props.get("dash", "dash"),
                line_color=props.get("color", "#7C3AED"),
                line_width=1.5,
                annotation_text=props.get("label", ""),
                annotation_position="top",
                annotation_font=dict(
                    color=props.get("color", "#7C3AED"),
                    size=10,
                    family="-apple-system, BlinkMacSystemFont, sans-serif"
                ),
                annotation_bgcolor="rgba(0,0,0,0.6)",
                layer="below"
            )
        except Exception:
            pass
    return fig


# ============================================================
# ФУНКЦИИ ОФОРМЛЕНИЯ ГРАФИКОВ
# ============================================================
PLOT_THEME = {
    "template": "plotly_dark",
    "plot_bgcolor": "rgba(0,0,0,0)",
    "paper_bgcolor": "rgba(0,0,0,0)",
    "font": {"color": "#FAFAFA", "family": "-apple-system, BlinkMacSystemFont, sans-serif"},
    "xaxis": {
        "gridcolor": "rgba(255,255,255,0.04)",
        "titlefont": {"color": "#71717A"},
        "tickfont": {"color": "#71717A"},
    },
    "yaxis": {
        "gridcolor": "rgba(255,255,255,0.04)",
        "titlefont": {"color": "#71717A"},
        "tickfont": {"color": "#71717A"},
    },
    "legend": {
        "font": {"color": "#FAFAFA"},
        "orientation": "h",
        "yanchor": "bottom",
        "y": 1.02,
        "xanchor": "right",
        "x": 1,
    },
    "hovermode": "x unified",
    "hoverlabel": {
        "bgcolor": "rgba(0,0,0,0.8)",
        "font": {"color": "#FAFAFA"},
    },
}


def apply_plot_theme(fig, height=420):
    """Применяет единый стиль к графику Plotly."""
    fig.update_layout(
        template=PLOT_THEME["template"],
        plot_bgcolor=PLOT_THEME["plot_bgcolor"],
        paper_bgcolor=PLOT_THEME["paper_bgcolor"],
        font=PLOT_THEME["font"],
        height=height,
        hovermode=PLOT_THEME["hovermode"],
        hoverlabel=PLOT_THEME["hoverlabel"],
        legend=PLOT_THEME["legend"],
        xaxis=PLOT_THEME["xaxis"],
        yaxis=PLOT_THEME["yaxis"],
        margin=dict(l=20, r=20, t=30, b=30),
    )
    return fig


def plot_line_chart(df, x_col, y_cols, names=None, colors=None, fill=False, height=420):
    """Универсальный линейный график."""
    fig = go.Figure()
    if names is None:
        names = y_cols
    if colors is None:
        colors = ["#7C3AED", "#22C55E", "#EF4444", "#F59E0B", "#3B82F6"]
    for i, (y_col, name) in enumerate(zip(y_cols, names)):
        color = colors[i % len(colors)]
        fig.add_trace(go.Scatter(
            x=df[x_col],
            y=df[y_col],
            name=name,
            line=dict(color=color, width=3),
            mode="lines+markers",
            marker=dict(size=5, color="white", line=dict(color=color, width=1.5)),
            fill="tozeroy" if fill else None,
            fillcolor=f"rgba({int(color[1:3], 16)}, {int(color[3:5], 16)}, {int(color[5:7], 16)}, 0.08)" if fill else None,
        ))
    fig = add_important_dates_to_fig(fig)
    return apply_plot_theme(fig, height)


def plot_bar_chart(df, x_col, y_col, color_col=None, horizontal=False, height=420):
    """Универсальный столбчатый график."""
    fig = go.Figure()
    if horizontal:
        fig.add_trace(go.Bar(
            y=df[x_col],
            x=df[y_col],
            orientation="h",
            marker=dict(
                color=df[color_col] if color_col else df[y_col],
                colorscale="Viridis",
                showscale=False if color_col is None else True,
            ),
            text=df[y_col].apply(lambda v: f"{v:.1f}" if isinstance(v, float) else f"{v:,}"),
            textposition="outside",
            textfont=dict(color="#A1A1AA", size=9),
        ))
        fig.update_layout(yaxis=dict(tickfont=dict(size=9)))
    else:
        fig.add_trace(go.Bar(
            x=df[x_col],
            y=df[y_col],
            marker=dict(
                color=df[color_col] if color_col else df[y_col],
                colorscale="Viridis",
                showscale=False if color_col is None else True,
            ),
            text=df[y_col].apply(lambda v: f"{v:.1f}" if isinstance(v, float) else f"{v:,}"),
            textposition="outside",
            textfont=dict(color="#A1A1AA", size=9),
        ))
        fig.update_layout(xaxis=dict(tickangle=-20, tickfont=dict(size=9)))
    return apply_plot_theme(fig, height)


def plot_scatter(df, x_col, y_col, text_col, size_col, color_col, height=480):
    """Универсальный точечный график."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df[x_col],
        y=df[y_col],
        mode="markers+text",
        text=df[text_col],
        textposition="top center",
        textfont=dict(color="#A1A1AA", size=8),
        marker=dict(
            size=df[size_col] * 25 + 8,
            color=df[color_col],
            colorscale="Viridis",
            showscale=True,
            colorbar=dict(title=color_col, titlefont=dict(color="#A1A1AA"), tickfont=dict(color="#71717A")),
            line=dict(color="rgba(255,255,255,0.1)", width=1),
            sizemode="area",
            sizeref=2. * max(df[size_col] * 25 + 8) / (40. ** 2),
            sizemin=4,
        ),
        hovertemplate="<b>%{text}</b><br>" + x_col + ": %{x:,.0f}<br>" + y_col + ": %{y:.1f}<br>" + color_col + ": %{marker.color:.1f}<extra></extra>"
    ))
    return apply_plot_theme(fig, height)


def plot_funnel(stages, values, height=380):
    """Универсальная воронка."""
    fig = go.Figure()
    fig.add_trace(go.Funnel(
        y=stages,
        x=values,
        textinfo="value+percent initial",
        textposition="inside",
        textfont=dict(color="#FAFAFA", size=12),
        marker=dict(
            color=["#7C3AED", "#A78BFA", "#22C55E"],
            line=dict(width=2, color="rgba(255,255,255,0.05)"),
        ),
        hovertemplate="<b>%{y}</b><br>%{x:,.0f}<br>%{percentInitial:.1f}%<extra></extra>"
    ))
    fig.update_layout(
        showlegend=False,
        margin=dict(l=20, r=20, t=20, b=20),
        xaxis=dict(title="Количество", titlefont=dict(color="#71717A"), tickfont=dict(color="#71717A"),
                   gridcolor="rgba(255,255,255,0.04)"),
        yaxis=dict(tickfont=dict(color="#A1A1AA")),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        height=height,
        font=dict(color="#A1A1AA", family="-apple-system, BlinkMacSystemFont, sans-serif"),
        hoverlabel=dict(bgcolor="rgba(0,0,0,0.8)", font=dict(color="#FAFAFA")),
    )
    return fig


# ============================================================
# ФУНКЦИИ ЭКСПОРТА
# ============================================================
def get_pdf_download_link(df, filename="report.pdf"):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        font_paths = [
            'DejaVuSans.ttf',
            './DejaVuSans.ttf',
            os.path.join(os.path.dirname(__file__), 'DejaVuSans.ttf'),
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ]
        font_registered = False
        for font_path in font_paths:
            try:
                if os.path.exists(font_path):
                    pdfmetrics.registerFont(TTFont('CyrillicFont', font_path))
                    font_registered = True
                    break
            except:
                continue
        font_name = 'CyrillicFont' if font_registered else 'Helvetica'

        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = tmp_file.name

        doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=22,
                                     textColor=colors.HexColor('#7C3AED'), spaceAfter=20, alignment=1,
                                     fontName=font_name)
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14,
                                       textColor=colors.HexColor('#A78BFA'), spaceAfter=10, spaceBefore=15,
                                       fontName=font_name)
        normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, fontName=font_name)

        story = []
        story.append(Paragraph("🎙️ Подкаст Аналитика — Отчет", title_style))
        story.append(Paragraph(f"📅 Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}", normal_style))
        story.append(
            Paragraph(f"📊 Период: {df['Дата прослушивания'].min().date()} — {df['Дата прослушивания'].max().date()}",
                      normal_style))
        story.append(Spacer(1, 15))

        # Общая статистика
        story.append(Paragraph("📊 Общая статистика", heading_style))
        stats_data = [
            ['Метрика', 'Значение'],
            ['Всего стартов', f"{df['Старты'].sum():,}"],
            ['Всего стримов', f"{df['Стримы'].sum():,}"],
            ['Конверсия', f"{safe_div(df['Стримы'].sum(), df['Старты'].sum()) * 100:.1f}%"],
            ['Средний % прослушивания', f"{df['Средний_прослушивания'].mean() * 100:.1f}%"],
            ['Средняя дослушиваемость', f"{df['Дослушиваемость'].mean() * 100:.1f}%"],
            ['Количество выпусков', f"{df['Выпуск'].nunique()}"],
        ]
        if 'Слушатели' in df.columns:
            stats_data.append(['👥 Всего слушателей', f"{df['Слушатели'].sum():,}"])
        if 'Часы' in df.columns:
            stats_data.append(['⏱ Всего часов', f"{df['Часы'].sum():,.1f}"])

        stats_table = Table(stats_data, colWidths=[3 * inch, 2.5 * inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#7C3AED')),
            ('TEXTCOLOR', (0, 0), (1, 0), colors.white),
            ('ALIGN', (0, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (1, -1), font_name),
            ('FONTSIZE', (0, 0), (1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (1, 0), 10),
            ('BACKGROUND', (0, 1), (1, -1), colors.HexColor('#f8f9fa')),
            ('GRID', (0, 0), (1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (1, -1), 9),
            ('VALIGN', (0, 0), (1, -1), 'MIDDLE'),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 15))

        # Топ по популярности
        story.append(Paragraph("🏆 Топ выпусков по популярности", heading_style))
        top_episodes = df.groupby(['Выпуск', 'Короткое название']).agg({
            'Старты': 'sum', 'Стримы': 'sum', 'Дослушиваемость': 'mean'
        }).reset_index().sort_values('Старты', ascending=False).head(10)
        top_data = [['#', 'Название', 'Старты', 'Стримы', 'Дослуш.']]
        for i, (_, row) in enumerate(top_episodes.iterrows()):
            name = row['Короткое название'][:40] if len(row['Короткое название']) > 40 else row['Короткое название']
            top_data.append(
                [str(i + 1), name, f"{row['Старты']:,}", f"{row['Стримы']:,}", f"{row['Дослушиваемость'] * 100:.1f}%"])
        top_table = Table(top_data, colWidths=[0.4 * inch, 2.8 * inch, 1 * inch, 1 * inch, 1 * inch])
        top_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(top_table)
        story.append(Spacer(1, 15))

        if 'Часы' in df.columns:
            story.append(Paragraph("🏆 Топ выпусков по часам", heading_style))
            top_hours = df.groupby(['Выпуск', 'Короткое название']).agg({
                'Часы': 'sum', 'Слушатели': 'sum'
            }).reset_index().sort_values('Часы', ascending=False).head(10)
            hours_data = [['#', 'Название', 'Часы', 'Слушатели']]
            for i, (_, row) in enumerate(top_hours.iterrows()):
                name = row['Короткое название'][:40] if len(row['Короткое название']) > 40 else row['Короткое название']
                hours_data.append([str(i + 1), name, f"{row['Часы']:,.1f}", f"{row['Слушатели']:,}"])
            hours_table = Table(hours_data, colWidths=[0.4 * inch, 2.8 * inch, 1 * inch, 1 * inch])
            hours_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(hours_table)
            story.append(Spacer(1, 15))

        story.append(Paragraph("🏆 Зал славы (лучшая дослушиваемость)", heading_style))
        hall = df.groupby(['Выпуск', 'Короткое название']).agg({
            'Дослушиваемость': 'mean', 'Старты': 'sum', 'Средний_прослушивания': 'mean'
        }).reset_index().sort_values('Дослушиваемость', ascending=False).head(10)
        hall_data = [['#', 'Название', 'Дослуш.', 'Старты', 'Средний %']]
        for i, (_, row) in enumerate(hall.iterrows()):
            name = row['Короткое название'][:40] if len(row['Короткое название']) > 40 else row['Короткое название']
            hall_data.append([str(i + 1), name, f"{row['Дослушиваемость'] * 100:.1f}%", f"{row['Старты']:,}",
                              f"{row['Средний_прослушивания'] * 100:.1f}%"])
        hall_table = Table(hall_data, colWidths=[0.4 * inch, 2.8 * inch, 1 * inch, 1 * inch, 1 * inch])
        hall_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22C55E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(hall_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph("⚠️ Зона риска (худшая дослушиваемость)", heading_style))
        danger = df.groupby(['Выпуск', 'Короткое название']).agg({
            'Дослушиваемость': 'mean', 'Старты': 'sum', 'Средний_прослушивания': 'mean'
        }).reset_index().sort_values('Дослушиваемость', ascending=True).head(10)
        danger_data = [['#', 'Название', 'Дослуш.', 'Старты', 'Средний %']]
        for i, (_, row) in enumerate(danger.iterrows()):
            name = row['Короткое название'][:40] if len(row['Короткое название']) > 40 else row['Короткое название']
            danger_data.append([str(i + 1), name, f"{row['Дослушиваемость'] * 100:.1f}%", f"{row['Старты']:,}",
                                f"{row['Средний_прослушивания'] * 100:.1f}%"])
        danger_table = Table(danger_data, colWidths=[0.4 * inch, 2.8 * inch, 1 * inch, 1 * inch, 1 * inch])
        danger_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(danger_table)
        story.append(Spacer(1, 15))

        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                      textColor=colors.grey, alignment=1, fontName=font_name)
        story.append(Paragraph("🎙️ Подкаст Аналитика Pro • Сгенерировано автоматически", footer_style))

        doc.build(story)
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
        os.unlink(pdf_path)

        b64 = base64.b64encode(pdf_data).decode()
        return f'<a href="data:application/pdf;base64,{b64}" download="{filename}" style="display:inline-block;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.15);color:#A78BFA;padding:10px 24px;border-radius:12px;text-decoration:none;font-weight:500;font-size:0.9rem;transition:all 0.2s ease;">📥 Скачать отчет (PDF)</a>'
    except Exception:
        return get_csv_download_link(df)


def get_csv_download_link(df, filename="report.csv"):
    try:
        csv = df.to_csv(index=False).encode('utf-8')
        b64 = base64.b64encode(csv).decode()
        return f'<a href="data:file/csv;base64,{b64}" download="{filename}" style="display:inline-block;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.15);color:#A78BFA;padding:10px 24px;border-radius:12px;text-decoration:none;font-weight:500;font-size:0.9rem;">📥 Скачать отчет (CSV)</a>'
    except Exception as e:
        return f'<span style="color:#EF4444;">⚠️ Ошибка: {str(e)}</span>'


# ============================================================
# ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ
# ============================================================
@st.cache_data
def load_data():
    try:
        df_total = pd.read_excel("Общая.xlsx", sheet_name="Общая")
        df_ref = pd.read_excel("Спр.xlsx", sheet_name="Спр")
        try:
            df_short = pd.read_excel("Короткие названия.xlsx")
            short_names_dict = dict(zip(df_short['Оригинальное название'], df_short['Короткое название']))
        except:
            short_names_dict = {}

        df_total['Дата прослушивания'] = pd.to_datetime(df_total['Дата прослушивания'])
        df_ref['Дата релиза'] = pd.to_datetime(df_ref['Дата релиза'])
        df_ref['Короткое название'] = df_ref['Выпуск'].map(short_names_dict).fillna(df_ref['Выпуск'])

        df_total['Средний_прослушивания'] = df_total.get('Средний % прослушивания', 0).fillna(0)
        df_total['Дослушиваемость'] = df_total.get('% дослушиваемости', 0).fillna(0)
        df_total['Слушатели'] = df_total.get('Слушатели', 0).fillna(0)
        df_total['Часы'] = df_total.get('Часы', 0).fillna(0)

        return df_total, df_ref, short_names_dict
    except Exception as e:
        st.error(f"❌ Ошибка загрузки данных: {e}")
        st.stop()


def calculate_rsi(df):
    df = df.copy()
    df['Конверсия_доля'] = df['Стримы'] / df['Старты']
    df['Конверсия_доля'] = df['Конверсия_доля'].fillna(0).replace([np.inf, -np.inf], 0)
    df['RSI'] = df['Стримы'] * (df['Конверсия_доля'] + 1) * (df['Старты'] ** 0.1)
    return df


def get_episode_position(episode_data, all_data, metric):
    if metric in ['Старты', 'Стримы']:
        episode_value = episode_data[metric].sum()
        all_values = all_data.groupby('Выпуск')[metric].sum()
    else:
        episode_value = episode_data[metric].mean()
        all_values = all_data.groupby('Выпуск')[metric].mean()

    mean_value = all_values.mean()
    if episode_value > mean_value * 1.1:
        status, color = "🔼 Значительно выше среднего", "#22C55E"
    elif episode_value > mean_value:
        status, color = "🔼 Выше среднего", "#7C3AED"
    elif episode_value > mean_value * 0.9:
        status, color = "➖ На уровне среднего", "#F59E0B"
    else:
        status, color = "🔽 Ниже среднего", "#EF4444"

    return {
        'value': episode_value,
        'mean': mean_value,
        'status': status,
        'color': color,
    }


def get_funnel_data(episode_data):
    total_starts = episode_data['Старты'].sum()
    avg_listen = episode_data['Средний_прослушивания'].mean() if 'Средний_прослушивания' in episode_data.columns else 0
    completion = episode_data['Дослушиваемость'].mean() if 'Дослушиваемость' in episode_data.columns else 0
    if pd.isna(avg_listen): avg_listen = 0
    if pd.isna(completion): completion = 0

    return {
        'total_starts': total_starts,
        'avg_listen': avg_listen,
        'completion': completion,
        'stage_1': total_starts,
        'stage_2': total_starts * avg_listen if total_starts > 0 else 0,
        'stage_3': total_starts * completion if total_starts > 0 else 0,
        'has_data': total_starts > 0 and (avg_listen > 0 or completion > 0)
    }


def get_life_curve(episode_data, release_date):
    episode_data = episode_data.sort_values('Дата прослушивания')
    episode_data['День от релиза'] = (episode_data['Дата прослушивания'] - release_date).dt.days + 1
    daily = episode_data.groupby('День от релиза').agg({
        'Стримы': 'sum',
        'Старты': 'sum',
        'Слушатели': 'sum',
        'Часы': 'sum'
    }).reset_index()
    daily['Стримы_накоп'] = daily['Стримы'].cumsum()
    daily['Старты_накоп'] = daily['Старты'].cumsum()
    daily['Часы_накоп'] = daily['Часы'].cumsum()
    total_streams = daily['Стримы'].sum()
    daily['Стримы_норм'] = (daily['Стримы_накоп'] / total_streams * 100).round(1) if total_streams > 0 else 0
    return daily


def get_life_curve_for_period(episode_name, df_merged, period_days=None):
    episode_data = df_merged[df_merged['Выпуск'] == episode_name].copy()
    if episode_data.empty:
        return None
    release_date = episode_data['Дата прослушивания'].min()
    if period_days is not None:
        episode_data = episode_data[
            episode_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=period_days - 1)]
    return get_life_curve(episode_data, release_date)


def get_short_name(long_name):
    return short_names_dict.get(long_name, long_name)


# ============================================================
# ЗАГРУЗКА ДАННЫХ
# ============================================================
with st.spinner("🔄 Загрузка данных..."):
    df_total, df_ref, short_names_dict = load_data()

df_merged = df_total.merge(df_ref, on='Выпуск', how='left')
df_merged['Средний_прослушивания'] = df_merged['Средний_прослушивания'].fillna(0)
df_merged['Дослушиваемость'] = df_merged['Дослушиваемость'].fillna(0)
df_merged['Слушатели'] = df_merged['Слушатели'].fillna(0)
df_merged['Часы'] = df_merged['Часы'].fillna(0)
df_merged = calculate_rsi(df_merged)

# ============================================================
# ФОРМИРОВАНИЕ СПИСКА ВЫПУСКОВ
# ============================================================
episode_names_ordered = {}
short_names_ordered = []
for ep in df_ref['Выпуск'].tolist():
    short = get_short_name(ep)
    if short not in episode_names_ordered:
        episode_names_ordered[short] = ep
        short_names_ordered.append(short)

# ============================================================
# ЗАГОЛОВОК
# ============================================================
st.markdown('<div class="main-title"><span>🎙️ Подкаст Аналитика</span></div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Премиум дашборд • Аналитика прослушиваний • Тренды</div>', unsafe_allow_html=True)

# ============================================================
# САЙДБАР
# ============================================================
page = st.sidebar.radio("📊 Меню", ["📊 Общая аналитика", "📋 Анализ выпуска", "🔄 Сравнение выпусков"], index=0)

with st.sidebar:
    st.markdown("---")
    st.markdown(
        '<span style="color:#71717A;font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;">📅 Важные даты</span>',
        unsafe_allow_html=True)
    for date_str, props in IMPORTANT_DATES.items():
        date_obj = pd.to_datetime(date_str)
        st.markdown(f'''
        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.1rem 0;">
            <span style="color:{props['color']};font-size:0.9rem;">●</span>
            <span style="color:#A1A1AA;font-size:0.75rem;">{props['label']}</span>
            <span style="color:#71717A;font-size:0.65rem;">{date_obj.strftime("%d.%m.%Y")}</span>
        </div>
        ''', unsafe_allow_html=True)
    st.markdown("---")

# ============================================================
# СТРАНИЦА 1: ОБЩАЯ АНАЛИТИКА
# ============================================================
if page == "📊 Общая аналитика":
    with st.sidebar:
        st.markdown(
            '<span style="color:#71717A;font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;">🎯 Фильтры</span>',
            unsafe_allow_html=True)
        st.markdown("---")
        min_date = df_total['Дата прослушивания'].min().date()
        max_date = df_total['Дата прослушивания'].max().date()
        date_range = st.date_input("📅 Период", value=(min_date, max_date), min_value=min_date, max_value=max_date)
        st.markdown("---")
        formats = ['Все'] + list(df_ref['Формат'].unique())
        selected_format = st.selectbox("📂 Формат", formats)
        genres = ['Все'] + list(df_ref['Жанр'].unique())
        selected_genre = st.selectbox("🎭 Жанр", genres)
        st.markdown("---")
        st.caption(f"**Записей:** {len(df_total):,}")
        st.caption(f"**Период:** {min_date} — {max_date}")
        st.caption(f"**Выпусков:** {len(df_ref):,}")

    # Фильтрация данных
    filtered_data = df_merged.copy()
    if len(date_range) == 2:
        filtered_data = filtered_data[
            (filtered_data['Дата прослушивания'].dt.date >= date_range[0]) &
            (filtered_data['Дата прослушивания'].dt.date <= date_range[1])
            ]
    if selected_format != 'Все':
        filtered_data = filtered_data[filtered_data['Формат'] == selected_format]
    if selected_genre != 'Все':
        filtered_data = filtered_data[filtered_data['Жанр'] == selected_genre]

    important_dates_legend()

    # Экспорт
    st.markdown("---")
    col_export, _ = st.columns([1, 5])
    with col_export:
        if st.button("🔄 Сгенерировать отчет", use_container_width=True):
            with st.spinner("Генерация отчета..."):
                st.markdown(get_pdf_download_link(filtered_data), unsafe_allow_html=True)
    st.markdown("---")

    # KPI
    total_starts = filtered_data['Старты'].sum()
    total_streams = filtered_data['Стримы'].sum()
    conversion = safe_div(total_streams, total_starts) * 100
    unique_episodes = filtered_data['Выпуск'].nunique()
    avg_rsi = filtered_data['RSI'].mean()
    avg_listen = filtered_data['Средний_прослушивания'].mean() * 100
    total_listeners = filtered_data['Слушатели'].sum() if 'Слушатели' in filtered_data.columns else 0
    total_hours = filtered_data['Часы'].sum() if 'Часы' in filtered_data.columns else 0
    hours_per_listener = safe_div(total_hours, total_listeners)
    starts_per_listener = safe_div(total_starts, total_listeners)

    create_metric_row([
        ("🎬", format_number(total_starts), "Всего стартов"),
        ("🎧", format_number(total_streams), "Всего стримов"),
        ("📈", format_percent(conversion), "Конверсия"),
        ("📝", format_number(unique_episodes), "Выпусков"),
        ("⭐", format_decimal(avg_rsi, 1), "Средний RSI"),
        ("🎯", format_percent(avg_listen), "Средний %"),
        ("👥", format_number(total_listeners), "Слушатели"),
        ("⏱", format_decimal(total_hours, 1), "Часы"),
        ("🎧", format_decimal(hours_per_listener, 2), "Часы на слушателя"),
        ("🔁", format_decimal(starts_per_listener, 2), "Старты на слушателя"),
    ])

    st.markdown("---")

    # Инфо блок
    st.markdown("""
    <div class="info-block">
        <div class="info-block-title">📖 Что означают метрики</div>
        <div class="info-grid">
            <div><div class="info-item-label">🎬 Старты</div><div class="info-item-desc">Количество запусков выпуска</div></div>
            <div><div class="info-item-label">🎧 Стримы</div><div class="info-item-desc">Прослушивания > 2 минут</div></div>
            <div><div class="info-item-label">📈 Конверсия</div><div class="info-item-desc">Стримы / Старты × 100%</div></div>
            <div><div class="info-item-label">👥 Слушатели</div><div class="info-item-desc">Уникальные пользователи</div></div>
            <div><div class="info-item-label">⏱ Часы</div><div class="info-item-desc">Суммарное время прослушивания</div></div>
            <div><div class="info-item-label">🎧 Часы на слушателя</div><div class="info-item-desc">Среднее количество часов на одного пользователя</div></div>
            <div style="grid-column: span 3; margin-top: 0.5rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.04);">
                <div class="info-item-label">⭐ RSI — Индекс успешности выпуска</div>
                <div class="info-item-desc"><strong style="color:#EF4444;">Стримы</strong> × (<strong style="color:#22C55E;">Конверсия</strong> + 1) × <strong style="color:#7C3AED;">Старты<sup>0.1</sup></strong></div>
            </div>
            <div style="grid-column: span 3; margin-top: 0.5rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.04);">
                <div class="info-item-label">🔁 Старты на слушателя</div>
                <div class="info-item-desc">Среднее число запусков одним пользователем</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ===== ДИНАМИКА ПРОСЛУШИВАНИЙ =====
    section_title("📊 Динамика прослушиваний")
    show_hint("💡", "Как читать",
              "Синяя линия — запуски. Красная — прослушивания >2 минут. Зеленая (пунктир) — конверсия.")

    daily_stats = filtered_data.groupby('Дата прослушивания').agg({
        'Старты': 'sum',
        'Стримы': 'sum'
    }).reset_index()
    daily_stats['Конверсия'] = safe_div(daily_stats['Стримы'], daily_stats['Старты']) * 100

    fig1 = make_subplots(specs=[[{"secondary_y": True}]])
    fig1.add_trace(go.Scatter(x=daily_stats['Дата прослушивания'], y=daily_stats['Старты'],
                              name='Старты', line=dict(color='#7C3AED', width=3),
                              fill='tozeroy', fillcolor='rgba(124,58,237,0.10)',
                              mode='lines+markers',
                              marker=dict(size=5, color='white', line=dict(color='#7C3AED', width=1.5))))
    fig1.add_trace(go.Scatter(x=daily_stats['Дата прослушивания'], y=daily_stats['Стримы'],
                              name='Стримы', line=dict(color='#EF4444', width=3),
                              fill='tozeroy', fillcolor='rgba(239,68,68,0.08)',
                              mode='lines+markers',
                              marker=dict(size=5, color='white', line=dict(color='#EF4444', width=1.5))))
    fig1.add_trace(go.Scatter(x=daily_stats['Дата прослушивания'], y=daily_stats['Конверсия'],
                              name='Конверсия (%)', line=dict(color='#22C55E', width=2, dash='dash'),
                              mode='lines+markers', marker=dict(size=4, color='#22C55E')), secondary_y=True)
    fig1 = add_important_dates_to_fig(fig1)
    fig1.update_layout(
        yaxis2=dict(title='Конверсия (%)', titlefont=dict(color='#22C55E'),
                    tickfont=dict(color='#22C55E'), overlaying='y', side='right', showgrid=False)
    )
    st.plotly_chart(apply_plot_theme(fig1, 420), use_container_width=True)

    # ===== ДИНАМИКА АУДИТОРИИ =====
    if 'Слушатели' in filtered_data.columns and 'Часы' in filtered_data.columns:
        section_title("👥 Динамика аудитории")
        show_hint("💡", "Как читать", "Желтая линия — слушатели. Бирюзовая — часы прослушивания.")

        daily_audience = filtered_data.groupby('Дата прослушивания').agg({
            'Слушатели': 'sum',
            'Часы': 'sum'
        }).reset_index()

        fig_audience = make_subplots(specs=[[{"secondary_y": True}]])
        fig_audience.add_trace(go.Scatter(x=daily_audience['Дата прослушивания'], y=daily_audience['Слушатели'],
                                          name='Слушатели', line=dict(color='#F59E0B', width=3),
                                          fill='tozeroy', fillcolor='rgba(245,158,11,0.08)',
                                          mode='lines+markers',
                                          marker=dict(size=5, color='white', line=dict(color='#F59E0B', width=1.5))))
        fig_audience.add_trace(go.Scatter(x=daily_audience['Дата прослушивания'], y=daily_audience['Часы'],
                                          name='Часы', line=dict(color='#3B82F6', width=3),
                                          fill='tozeroy', fillcolor='rgba(59,130,246,0.08)',
                                          mode='lines+markers',
                                          marker=dict(size=5, color='white', line=dict(color='#3B82F6', width=1.5))),
                               secondary_y=True)
        fig_audience = add_important_dates_to_fig(fig_audience)
        fig_audience.update_layout(
            yaxis=dict(title='Слушатели', titlefont=dict(color='#F59E0B')),
            yaxis2=dict(title='Часы', titlefont=dict(color='#3B82F6'),
                        tickfont=dict(color='#3B82F6'), overlaying='y', side='right', showgrid=False)
        )
        st.plotly_chart(apply_plot_theme(fig_audience, 400), use_container_width=True)

    # ===== ТЕПЛОВАЯ КАРТА ПО ДНЯМ =====
    if 'Часы' in filtered_data.columns:
        section_title("📅 Активность по дням недели (часы)")
        show_hint("💡", "Как читать", "Показывает, в какие дни аудитория слушает больше всего.")

        filtered_data['День недели'] = filtered_data['Дата прослушивания'].dt.day_name()
        weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekday_labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        weekday_hours = filtered_data.groupby('День недели')['Часы'].sum().reindex(weekday_order).reset_index()
        weekday_hours['День'] = weekday_labels
        weekday_hours['Часы_норм'] = safe_div(weekday_hours['Часы'], weekday_hours['Часы'].max()) * 100

        fig_heat = go.Figure()
        fig_heat.add_trace(go.Bar(
            x=weekday_hours['День'],
            y=weekday_hours['Часы'],
            marker=dict(
                color=weekday_hours['Часы_норм'],
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title='% от макс', titlefont=dict(color='#A1A1AA'), tickfont=dict(color='#71717A'))
            ),
            text=weekday_hours['Часы'].apply(lambda x: f'{x:.1f}'),
            textposition='outside',
            textfont=dict(color='#A1A1AA', size=10),
        ))
        fig_heat.update_layout(showlegend=False, xaxis=dict(tickfont=dict(size=11)), yaxis=dict(title='Часы'))
        st.plotly_chart(apply_plot_theme(fig_heat, 320), use_container_width=True)

        # ===== МАТРИЦА КАЧЕСТВА =====
    section_title("🎯 Матрица качества и популярности")
    show_hint("💡", "Как читать", "Каждый кружок — выпуск. Чем правее — тем популярнее. Чем выше — тем качественнее.")

    heatmap_data = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
        'Старты': 'sum', 'Стримы': 'sum', 'Средний_прослушивания': 'mean',
        'Дослушиваемость': 'mean', 'RSI': 'mean'
    }).reset_index()
    heatmap_data = heatmap_data[heatmap_data['Старты'] >= 10]

    if not heatmap_data.empty:
        fig_heatmap = go.Figure()
        fig_heatmap.add_trace(go.Scatter(
            x=heatmap_data['Старты'],
            y=heatmap_data['Дослушиваемость'] * 100,
            mode='markers+text',
            text=heatmap_data['Короткое название'],
            textposition='top center',
            textfont=dict(color='#A1A1AA', size=8),
            marker=dict(
                size=heatmap_data['Средний_прослушивания'] * 25 + 8,
                color=heatmap_data['RSI'],
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title='RSI', titlefont=dict(color='#A1A1AA'), tickfont=dict(color='#71717A')),
                line=dict(color='rgba(255,255,255,0.1)', width=1),
                sizemode='area',
                sizeref=2. * max(heatmap_data['Средний_прослушивания'] * 25 + 8) / (40. ** 2),
                sizemin=4,
            ),
            hovertemplate='<b>%{text}</b><br>Старты: %{x:,.0f}<br>Дослушиваемость: %{y:.1f}%<br>RSI: %{marker.color:.1f}<extra></extra>'
        ))

        median_starts = heatmap_data['Старты'].median()
        median_completion = heatmap_data['Дослушиваемость'].median() * 100
        fig_heatmap.add_hline(y=median_completion, line_dash="dash", line_color="rgba(255,255,255,0.08)", line_width=1)
        fig_heatmap.add_vline(x=median_starts, line_dash="dash", line_color="rgba(255,255,255,0.08)", line_width=1)

        max_x = heatmap_data['Старты'].max()
        max_y = heatmap_data['Дослушиваемость'].max() * 100

        # ИСПРАВЛЕННЫЙ БЛОК — УБРАЛ weight
        annotations = [
            (max_x * 0.85, max_y * 0.85, "⭐ ХИТЫ", "#22C55E"),
            (max_x * 0.15, max_y * 0.85, "💎 НИШЕВЫЕ", "#7C3AED"),
            (max_x * 0.85, max_y * 0.15, "📊 МАССОВЫЕ", "#F59E0B"),
            (max_x * 0.15, max_y * 0.15, "❌ ПРОВАЛЫ", "#EF4444"),
        ]
        for x, y, text, color in annotations:
            fig_heatmap.add_annotation(
                x=x,
                y=y,
                text=text,
                showarrow=False,
                font=dict(color=color, size=14),  # УБРАЛ weight
                opacity=0.3
            )

        fig_heatmap.update_layout(
            xaxis=dict(title='Старты (популярность)', type='log'),
            yaxis=dict(title='Дослушиваемость % (качество)', range=[0, 105]),
            hovermode='closest',
        )
        st.plotly_chart(apply_plot_theme(fig_heatmap, 480), use_container_width=True)
    else:
        st.info("ℹ️ Недостаточно данных для построения матрицы (нужно минимум 10 стартов на выпуск)")

    # ===== SCATTER: СЛУШАТЕЛИ vs ЧАСЫ =====
    if 'Слушатели' in filtered_data.columns and 'Часы' in filtered_data.columns:
        section_title("📊 Аудитория: слушатели vs часы")
        show_hint("💡", "Как читать", "Размер кружка = дослушиваемость. Цвет = RSI.")

        scatter_data = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
            'Слушатели': 'sum',
            'Часы': 'sum',
            'Дослушиваемость': 'mean',
            'RSI': 'mean'
        }).reset_index()
        scatter_data = scatter_data[scatter_data['Слушатели'] > 0]

        if not scatter_data.empty:
            fig_scatter = plot_scatter(
                scatter_data,
                x_col='Слушатели',
                y_col='Часы',
                text_col='Короткое название',
                size_col='Дослушиваемость',
                color_col='RSI'
            )
            fig_scatter.update_layout(
                xaxis=dict(title='Слушатели', type='log'),
                yaxis=dict(title='Часы')
            )
            st.plotly_chart(fig_scatter, use_container_width=True)
        else:
            st.info("ℹ️ Недостаточно данных для построения графика")

    # ===== ТОП ПО ЧАСАМ =====
    if 'Часы' in filtered_data.columns:
        section_title("⏱ Топ выпусков по часам прослушивания")
        show_hint("💡", "Что показывает", "Какие выпуски собрали больше всего часов прослушивания.")

        top_hours = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
            'Часы': 'sum',
            'Слушатели': 'sum'
        }).reset_index().sort_values('Часы', ascending=False).head(10)
        top_hours['Эффективность'] = safe_div(top_hours['Часы'], top_hours['Слушатели'])

        if not top_hours.empty and top_hours['Часы'].sum() > 0:
            fig_hours = plot_bar_chart(
                top_hours,
                x_col='Короткое название',
                y_col='Часы',
                color_col='Часы',
                horizontal=True
            )
            fig_hours.update_layout(
                xaxis=dict(title='Часы'),
                yaxis=dict(title='', tickfont=dict(size=10)),
                margin=dict(l=10, r=80, t=10, b=30)
            )
            st.plotly_chart(fig_hours, use_container_width=True)
        else:
            st.info("ℹ️ Нет данных по часам прослушивания")

    # ===== ТОП ПО СЛУШАТЕЛЯМ =====
    if 'Слушатели' in filtered_data.columns:
        section_title("👥 Топ выпусков по слушателям")
        show_hint("💡", "Что показывает", "Какие выпуски собрали больше всего уникальных слушателей.")

        top_listeners = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
            'Слушатели': 'sum',
            'Часы': 'sum'
        }).reset_index().sort_values('Слушатели', ascending=False).head(10)

        if not top_listeners.empty and top_listeners['Слушатели'].sum() > 0:
            fig_listeners = plot_bar_chart(
                top_listeners,
                x_col='Короткое название',
                y_col='Слушатели',
                color_col='Слушатели',
                horizontal=True
            )
            fig_listeners.update_layout(
                xaxis=dict(title='Слушатели'),
                yaxis=dict(title='', tickfont=dict(size=10)),
                margin=dict(l=10, r=80, t=10, b=30)
            )
            st.plotly_chart(fig_listeners, use_container_width=True)
        else:
            st.info("ℹ️ Нет данных по слушателям")

    # ===== ТОП ПО ЭФФЕКТИВНОСТИ =====
    if 'Слушатели' in filtered_data.columns and 'Часы' in filtered_data.columns:
        section_title("🎯 Топ выпусков по эффективности (часы на слушателя)")
        show_hint("💡", "Что показывает", "Сколько часов в среднем слушает один пользователь.")

        top_eff = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
            'Часы': 'sum',
            'Слушатели': 'sum'
        }).reset_index()
        top_eff['Эффективность'] = safe_div(top_eff['Часы'], top_eff['Слушатели'])
        top_eff = top_eff.sort_values('Эффективность', ascending=False).head(10)

        if not top_eff.empty and top_eff['Эффективность'].sum() > 0:
            fig_eff = plot_bar_chart(
                top_eff,
                x_col='Короткое название',
                y_col='Эффективность',
                color_col='Эффективность',
                horizontal=True
            )
            fig_eff.update_layout(
                xaxis=dict(title='Часов на слушателя'),
                yaxis=dict(title='', tickfont=dict(size=10)),
                margin=dict(l=10, r=80, t=10, b=30)
            )
            st.plotly_chart(fig_eff, use_container_width=True)
        else:
            st.info("ℹ️ Недостаточно данных для рейтинга эффективности")

    # ===== PARETO =====
    if 'Часы' in filtered_data.columns:
        section_title("📊 Pareto: накопленная доля часов по выпускам")
        show_hint("💡", "Как читать", "Какие 20% выпусков дают 80% часов прослушивания.")

        pareto_data = filtered_data.groupby('Выпуск')['Часы'].sum().sort_values(ascending=False).reset_index()
        pareto_data['Накопленные_часы'] = pareto_data['Часы'].cumsum()
        pareto_data['Накопленный_%'] = safe_div(pareto_data['Накопленные_часы'], pareto_data['Часы'].sum()) * 100
        pareto_data['Номер'] = range(1, len(pareto_data) + 1)

        if len(pareto_data) > 1 and pareto_data['Часы'].sum() > 0:
            fig_pareto = make_subplots(specs=[[{"secondary_y": True}]])
            fig_pareto.add_trace(go.Bar(
                x=pareto_data['Номер'],
                y=pareto_data['Часы'],
                name='Часы по выпускам',
                marker=dict(color='#7C3AED', opacity=0.6),
            ))
            fig_pareto.add_trace(go.Scatter(
                x=pareto_data['Номер'],
                y=pareto_data['Накопленный_%'],
                name='Накопленный %',
                line=dict(color='#EF4444', width=3),
                mode='lines+markers',
                marker=dict(size=6, color='white', line=dict(color='#EF4444', width=1.5)),
            ), secondary_y=True)
            fig_pareto.add_hline(y=80, line_dash="dash", line_color="#22C55E", line_width=2,
                                 annotation_text="80%", annotation_font=dict(color="#22C55E", size=10),
                                 secondary_y=True)
            fig_pareto.update_layout(
                xaxis=dict(title='Выпуски (по убыванию часов)', tickfont=dict(size=10)),
                yaxis=dict(title='Часы', titlefont=dict(color='#7C3AED')),
                yaxis2=dict(title='Накопленный %', titlefont=dict(color='#EF4444'),
                            tickfont=dict(color='#EF4444'), overlaying='y', side='right',
                            showgrid=False, range=[0, 105]),
                hovermode='x unified',
            )
            st.plotly_chart(apply_plot_theme(fig_pareto, 400), use_container_width=True)
        else:
            st.info("ℹ️ Недостаточно данных для Pareto-анализа")

    # ===== ЗАЛ СЛАВЫ / ЗОНА РИСКА =====
    section_title("🏆 Зал славы и ⚠️ Зона риска")
    show_hint("💡", "Что это", "Зал славы — выпуски с лучшей дослушиваемостью. Зона риска — с худшей.")

    hall_data = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
        'Старты': 'sum', 'Стримы': 'sum', 'Дослушиваемость': 'mean',
        'Средний_прослушивания': 'mean', 'RSI': 'mean'
    }).reset_index()
    hall_data = hall_data[hall_data['Старты'] >= 10]

    if not hall_data.empty:
        hall_of_fame = hall_data.sort_values('Дослушиваемость', ascending=False).head(5)
        danger_zone = hall_data.sort_values('Дослушиваемость', ascending=True).head(5)

        col1, col2 = st.columns(2)
        with col1:
            st.markdown("""
            <div style="text-align:left;margin-bottom:0.8rem;">
                <span style="font-size:1.2rem;font-weight:600;color:#22C55E;">🏆 Зал славы</span>
                <span style="font-size:0.6rem;color:#71717A;margin-left:0.5rem;text-transform:uppercase;letter-spacing:0.06em;">лучшая дослушиваемость</span>
            </div>
            """, unsafe_allow_html=True)
            for i, (_, row) in enumerate(hall_of_fame.iterrows()):
                medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]
                st.markdown(f"""
                <div class="hall-item">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-size:1rem;">{medal}</span>
                            <span style="color:#FAFAFA;font-weight:500;margin-left:0.3rem;font-size:0.85rem;">{row['Короткое название']}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="color:#22C55E;font-weight:600;font-size:1rem;">{row['Дослушиваемость'] * 100:.1f}%</span>
                            <span style="color:#71717A;font-size:0.6rem;margin-left:0.3rem;">{row['Старты']:,}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:0.8rem;margin-top:0.2rem;font-size:0.65rem;color:#71717A;">
                        <span>🎯 {row['Средний_прослушивания'] * 100:.1f}%</span>
                        <span>⭐ RSI {row['RSI']:.1f}</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)

        with col2:
            st.markdown("""
            <div style="text-align:left;margin-bottom:0.8rem;">
                <span style="font-size:1.2rem;font-weight:600;color:#EF4444;">⚠️ Зона риска</span>
                <span style="font-size:0.6rem;color:#71717A;margin-left:0.5rem;text-transform:uppercase;letter-spacing:0.06em;">худшая дослушиваемость</span>
            </div>
            """, unsafe_allow_html=True)
            for i, (_, row) in enumerate(danger_zone.iterrows()):
                st.markdown(f"""
                <div class="danger-item">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-size:1rem;">{'⚠️' if i < 3 else '📌'}</span>
                            <span style="color:#FAFAFA;font-weight:500;margin-left:0.3rem;font-size:0.85rem;">{row['Короткое название']}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="color:#EF4444;font-weight:600;font-size:1rem;">{row['Дослушиваемость'] * 100:.1f}%</span>
                            <span style="color:#71717A;font-size:0.6rem;margin-left:0.3rem;">{row['Старты']:,}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:0.8rem;margin-top:0.2rem;font-size:0.65rem;color:#71717A;">
                        <span>🎯 {row['Средний_прослушивания'] * 100:.1f}%</span>
                        <span>⭐ RSI {row['RSI']:.1f}</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("ℹ️ Недостаточно данных для Зала славы и Зоны риска (нужно минимум 10 стартов на выпуск)")

    # ===== ТОП RSI =====
    section_title("🏆 Топ выпусков по RSI")
    show_hint("💡", "Что такое RSI", "Индекс успешности выпуска. Чем выше — тем лучше выпуск по всем параметрам.")

    episode_rsi = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
        'Старты': 'sum', 'Стримы': 'sum', 'RSI': 'mean'
    }).reset_index()
    episode_rsi['Конверсия'] = safe_div(episode_rsi['Стримы'], episode_rsi['Старты']) * 100
    episode_rsi = episode_rsi.sort_values('RSI', ascending=False)
    top_rsi = episode_rsi.head(10)

    col1, col2 = st.columns([2, 1])
    with col1:
        fig_rsi = plot_bar_chart(
            top_rsi,
            x_col='Короткое название',
            y_col='RSI',
            color_col='RSI'
        )
        fig_rsi.update_layout(
            xaxis=dict(title='', tickangle=-25),
            yaxis=dict(title='RSI'),
            margin=dict(l=10, r=30, t=10, b=50),
        )
        st.plotly_chart(fig_rsi, use_container_width=True)
    with col2:
        st.markdown("""
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:16px;padding:1.2rem;">
            <div style="color:#71717A;font-size:0.65rem;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:0.8rem;">⭐ Топ RSI</div>
        """, unsafe_allow_html=True)
        for i, (_, row) in enumerate(top_rsi.head(5).iterrows()):
            medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]
            st.markdown(f"""
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                <div>
                    <span style="color:#71717A;font-size:0.7rem;">{medal}</span>
                    <span style="color:#A1A1AA;font-size:0.8rem;margin-left:0.3rem;">{row['Короткое название']}</span>
                </div>
                <span style="color:#7C3AED;font-weight:600;font-size:0.85rem;">{row['RSI']:.1f}</span>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # ===== ТОП ЖАНРОВ =====
    section_title("🎭 Топ жанров")
    show_hint("💡", "О чем графики", "Первый — по популярности. Второй — по вовлеченности. Третий — по качеству.")

    genre_stats = filtered_data.groupby('Жанр').agg({
        'Старты': 'sum', 'Стримы': 'sum', 'RSI': 'mean',
        'Дослушиваемость': 'mean', 'Средний_прослушивания': 'mean'
    }).reset_index()
    genre_stats['Конверсия'] = safe_div(genre_stats['Стримы'], genre_stats['Старты']) * 100
    genre_stats = genre_stats.sort_values('Старты', ascending=False)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown('<div style="color:#7C3AED;font-weight:600;font-size:0.9rem;padding:0.3rem 0;">📊 По стартам</div>',
                    unsafe_allow_html=True)
        top_genre = genre_stats.head(8)
        fig_g1 = go.Figure()
        fig_g1.add_trace(go.Bar(
            x=top_genre['Жанр'], y=top_genre['Старты'],
            marker=dict(color=top_genre['Старты'], colorscale='Viridis', showscale=False),
            text=top_genre['Старты'], textposition='outside', textfont=dict(color='#A1A1AA', size=8)
        ))
        fig_g1.update_layout(showlegend=False, height=260, xaxis=dict(tickangle=-15, tickfont=dict(size=8)))
        st.plotly_chart(apply_plot_theme(fig_g1, 260), use_container_width=True)

    with col2:
        st.markdown('<div style="color:#EF4444;font-weight:600;font-size:0.9rem;padding:0.3rem 0;">🎧 По стримам</div>',
                    unsafe_allow_html=True)
        top_genre = genre_stats.sort_values('Стримы', ascending=False).head(8)
        fig_g2 = go.Figure()
        fig_g2.add_trace(go.Bar(
            x=top_genre['Жанр'], y=top_genre['Стримы'],
            marker=dict(color=top_genre['Стримы'], colorscale='Reds', showscale=False),
            text=top_genre['Стримы'], textposition='outside', textfont=dict(color='#A1A1AA', size=8)
        ))
        fig_g2.update_layout(showlegend=False, height=260, xaxis=dict(tickangle=-15, tickfont=dict(size=8)))
        st.plotly_chart(apply_plot_theme(fig_g2, 260), use_container_width=True)

    with col3:
        st.markdown(
            '<div style="color:#22C55E;font-weight:600;font-size:0.9rem;padding:0.3rem 0;">📈 По дослушиваемости</div>',
            unsafe_allow_html=True)
        top_genre = genre_stats[genre_stats['Старты'] > 10].sort_values('Дослушиваемость', ascending=False).head(8)
        fig_g3 = go.Figure()
        fig_g3.add_trace(go.Bar(
            x=top_genre['Жанр'], y=top_genre['Дослушиваемость'] * 100,
            marker=dict(color=top_genre['Дослушиваемость'] * 100, colorscale='Greens', showscale=False),
            text=top_genre['Дослушиваемость'] * 100, texttemplate='%{text:.1f}%',
            textposition='outside', textfont=dict(color='#A1A1AA', size=8)
        ))
        fig_g3.update_layout(showlegend=False, height=260, xaxis=dict(tickangle=-15, tickfont=dict(size=8)))
        st.plotly_chart(apply_plot_theme(fig_g3, 260), use_container_width=True)

    # ===== АКТИВНОСТЬ ПО ДНЯМ НЕДЕЛИ =====
    section_title("📅 Активность по дням недели")
    show_hint("💡", "Зачем смотреть", "Показывает, в какие дни недели у вас пик прослушиваний.")

    filtered_data['День недели'] = filtered_data['Дата прослушивания'].dt.day_name()
    weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    weekday_labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    weekday_stats = filtered_data.groupby('День недели').agg({
        'Старты': 'sum', 'Стримы': 'sum'
    }).reindex(weekday_order).reset_index()
    weekday_stats['День'] = weekday_labels

    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div style="color:#7C3AED;font-weight:600;font-size:0.9rem;padding:0.3rem 0;">📊 По стартам</div>',
                    unsafe_allow_html=True)
        fig_w1 = go.Figure()
        fig_w1.add_trace(go.Bar(
            x=weekday_stats['День'], y=weekday_stats['Старты'],
            marker=dict(color=['#7C3AED', '#22C55E', '#A78BFA', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6']),
            text=weekday_stats['Старты'], textposition='outside', textfont=dict(color='#A1A1AA', size=9)
        ))
        fig_w1.update_layout(showlegend=False, height=280, xaxis=dict(title='День недели', tickfont=dict(size=10)))
        st.plotly_chart(apply_plot_theme(fig_w1, 280), use_container_width=True)

    with col2:
        st.markdown('<div style="color:#EF4444;font-weight:600;font-size:0.9rem;padding:0.3rem 0;">🎧 По стримам</div>',
                    unsafe_allow_html=True)
        fig_w2 = go.Figure()
        fig_w2.add_trace(go.Bar(
            x=weekday_stats['День'], y=weekday_stats['Стримы'],
            marker=dict(color=['#7C3AED', '#22C55E', '#A78BFA', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6']),
            text=weekday_stats['Стримы'], textposition='outside', textfont=dict(color='#A1A1AA', size=9)
        ))
        fig_w2.update_layout(showlegend=False, height=280, xaxis=dict(title='День недели', tickfont=dict(size=10)))
        st.plotly_chart(apply_plot_theme(fig_w2, 280), use_container_width=True)

    # ===== СВОДНАЯ ТАБЛИЦА =====
    section_title("📋 Полная сводка по выпускам")
    show_hint("💡", "Что в таблице", "Все выпуски с главными метриками. Сортировка по RSI.")

    episode_summary = filtered_data.groupby(['Выпуск', 'Короткое название']).agg({
        'Старты': 'sum', 'Стримы': 'sum', 'RSI': 'mean',
        'Дослушиваемость': 'mean', 'Средний_прослушивания': 'mean',
        'Слушатели': 'sum', 'Часы': 'sum',
        'Формат': 'first', 'Жанр': 'first'
    }).reset_index()
    episode_summary['Конверсия'] = safe_div(episode_summary['Стримы'], episode_summary['Старты']) * 100
    episode_summary['Часы_на_слушателя'] = safe_div(episode_summary['Часы'], episode_summary['Слушатели'])
    episode_summary['Старты_на_слушателя'] = safe_div(episode_summary['Старты'], episode_summary['Слушатели'])
    episode_summary = episode_summary.sort_values('RSI', ascending=False)

    display_df = episode_summary[[
        'Короткое название', 'Старты', 'Стримы', 'Конверсия',
        'Дослушиваемость', 'Средний_прослушивания', 'RSI',
        'Слушатели', 'Часы', 'Часы_на_слушателя', 'Старты_на_слушателя',
        'Формат', 'Жанр'
    ]].copy()
    display_df.columns = [
        'Название', 'Старты', 'Стримы', 'Конверсия %',
        'Дослушиваемость %', 'Средний %', 'RSI',
        'Слушатели', 'Часы', 'Часы/слушателя', 'Старты/слушателя',
        'Формат', 'Жанр'
    ]
    display_df['Дослушиваемость %'] *= 100
    display_df['Средний %'] *= 100

    try:
        st.dataframe(display_df.head(50), width=1200, height=400)
    except:
        st.dataframe(display_df.head(50), height=400)

    st.markdown("---")
    st.markdown(
        """<div class="footer">🎙️ Подкаст Аналитика Pro • Премиум дашборд • Данные обновляются автоматически</div>""",
        unsafe_allow_html=True)

    with st.expander("ℹ️ Информация о данных"):
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"""
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">📅 Период</div>
                <div style="color:#FAFAFA;font-size:1rem;font-weight:500;margin-top:0.2rem;">{filtered_data['Дата прослушивания'].min().date()} — {filtered_data['Дата прослушивания'].max().date()}</div>
            </div>
            <br>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">📊 Всего записей</div>
                <div style="color:#FAFAFA;font-size:1rem;font-weight:500;margin-top:0.2rem;">{len(filtered_data):,}</div>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">📝 Уникальных выпусков</div>
                <div style="color:#FAFAFA;font-size:1rem;font-weight:500;margin-top:0.2rem;">{filtered_data['Выпуск'].nunique()}</div>
            </div>
            <br>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">🎭 Жанры</div>
                <div style="color:#A1A1AA;font-size:0.85rem;margin-top:0.2rem;">{', '.join(filtered_data['Жанр'].unique())}</div>
            </div>
            """, unsafe_allow_html=True)
        with col3:
            st.markdown(f"""
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">📂 Форматы</div>
                <div style="color:#A1A1AA;font-size:0.85rem;margin-top:0.2rem;">{', '.join(filtered_data['Формат'].unique())}</div>
            </div>
            <br>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:1rem;">
                <div style="color:#71717A;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;">⭐ Средний RSI</div>
                <div style="color:#FAFAFA;font-size:1rem;font-weight:500;margin-top:0.2rem;">{episode_summary['RSI'].mean():.1f}</div>
            </div>
            """, unsafe_allow_html=True)

# ============================================================
# СТРАНИЦА 2: АНАЛИЗ ВЫПУСКА
# ============================================================
elif page == "📋 Анализ выпуска":
    st.markdown(
        '<div style="font-size:1.8rem;font-weight:600;color:#FAFAFA;margin-bottom:0.3rem;">📋 Детальный анализ выпуска</div>',
        unsafe_allow_html=True)
    important_dates_legend()

    period = st.radio(
        "📅 Выберите период анализа:",
        ["1 день", "1 неделя", "1 месяц", "Всё время"],
        horizontal=True,
        index=3,
        key="analysis_period"
    )

    selected_short = st.selectbox("🎯 Выберите выпуск:", short_names_ordered, key="analysis_episode")
    selected_episode = episode_names_ordered[selected_short]

    all_data = df_merged[df_merged['Выпуск'] == selected_episode].copy()
    release_date = df_total[df_total['Выпуск'] == selected_episode]['Дата прослушивания'].min()

    if all_data.empty:
        st.warning(f"⚠️ Нет данных для выпуска '{selected_short}'")
    else:
        if period == "1 день":
            episode_data = all_data[(all_data['Дата прослушивания'] >= release_date) & (
                        all_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=0))]
        elif period == "1 неделя":
            episode_data = all_data[(all_data['Дата прослушивания'] >= release_date) & (
                        all_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=6))]
        elif period == "1 месяц":
            episode_data = all_data[(all_data['Дата прослушивания'] >= release_date) & (
                        all_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=29))]
        else:
            episode_data = all_data

        if episode_data.empty:
            st.warning(f"⚠️ Нет данных для выпуска '{selected_short}' в выбранном периоде")
        else:
            total_starts_ep = episode_data['Старты'].sum()
            total_streams_ep = episode_data['Стримы'].sum()
            conv_ep = safe_div(total_streams_ep, total_starts_ep) * 100
            rsi_ep = episode_data['RSI'].mean()
            total_listeners_ep = episode_data['Слушатели'].sum()
            total_hours_ep = episode_data['Часы'].sum()

            # KPI
            create_metric_row([
                ("🎬", format_number(total_starts_ep), "Всего стартов"),
                ("🎧", format_number(total_streams_ep), "Всего стримов"),
                ("📈", format_percent(conv_ep), "Конверсия"),
                ("⭐", format_decimal(rsi_ep, 1), "Средний RSI"),
                ("👥", format_number(total_listeners_ep), "Слушатели"),
                ("⏱", format_decimal(total_hours_ep, 1), "Часы"),
            ])

            st.markdown("---")
            section_title("ℹ️ Информация о выпуске")

            info = df_ref[df_ref['Выпуск'] == selected_episode].iloc[0]
            days_active = (episode_data['Дата прослушивания'].max() - episode_data['Дата прослушивания'].min()).days

            col1, col2, col3, col4, col5 = st.columns(5)
            info_items = [
                ("📂 Формат", info['Формат']),
                ("🎭 Жанр", info['Жанр']),
                ("📅 Первая дата", release_date.date()),
                ("📆 Дней в выборке", f"{days_active + 1}"),
                ("⏱️ Длительность", info['Длительность'])
            ]
            for col, (label, value) in zip([col1, col2, col3, col4, col5], info_items):
                col.markdown(f"""
                <div class="metric-detail">
                    <div class="label">{label}</div>
                    <div class="value">{value}</div>
                </div>
                """, unsafe_allow_html=True)

            st.markdown("---")
            section_title("📊 Сравнение со средними показателями")

            compare_data = df_merged.copy()
            if period == "1 день":
                compare_data = compare_data[(compare_data['Дата прослушивания'] >= release_date) & (
                            compare_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=0))]
            elif period == "1 неделя":
                compare_data = compare_data[(compare_data['Дата прослушивания'] >= release_date) & (
                            compare_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=6))]
            elif period == "1 месяц":
                compare_data = compare_data[(compare_data['Дата прослушивания'] >= release_date) & (
                            compare_data['Дата прослушивания'] <= release_date + pd.Timedelta(days=29))]

            metrics = ['Старты', 'Стримы', 'RSI', 'Слушатели', 'Часы']
            comparison_data = []
            for metric in metrics:
                pos = get_episode_position(episode_data, compare_data, metric)
                comparison_data.append({
                    'Метрика': metric,
                    'Значение': f"{pos['value']:.1f}",
                    'Среднее': f"{pos['mean']:.1f}",
                    'Статус': pos['status']
                })
            st.dataframe(pd.DataFrame(comparison_data), use_container_width=True)

            # Динамика
            st.markdown("---")
            section_title("📈 Динамика прослушиваний")
            daily_data = episode_data.groupby('Дата прослушивания').agg({
                'Старты': 'sum', 'Стримы': 'sum'
            }).reset_index()

            fig = go.Figure()
            fig.add_trace(go.Scatter(x=daily_data['Дата прослушивания'], y=daily_data['Старты'],
                                     name='Старты', line=dict(color='#7C3AED', width=3),
                                     fill='tozeroy', fillcolor='rgba(124,58,237,0.08)'))
            fig.add_trace(go.Scatter(x=daily_data['Дата прослушивания'], y=daily_data['Стримы'],
                                     name='Стримы', line=dict(color='#EF4444', width=3),
                                     fill='tozeroy', fillcolor='rgba(239,68,68,0.08)'))
            fig.add_shape(type="line", x0=release_date, y0=0, x1=release_date, y1=1, yref="paper",
                          line=dict(color="#A78BFA", width=2, dash="dash"))
            fig.add_annotation(x=release_date, y=0.98, yref="paper", text="📅 Релиз",
                               showarrow=False, font=dict(color="#A78BFA", size=10), textangle=-90)
            fig = add_important_dates_to_fig(fig)
            st.plotly_chart(apply_plot_theme(fig, 380), use_container_width=True)

            # Динамика аудитории
            if 'Слушатели' in episode_data.columns and 'Часы' in episode_data.columns:
                st.markdown("---")
                section_title("👥 Динамика аудитории выпуска")
                daily_audience = episode_data.groupby('Дата прослушивания').agg({
                    'Слушатели': 'sum', 'Часы': 'sum'
                }).reset_index()

                if not daily_audience.empty:
                    fig_aud = make_subplots(specs=[[{"secondary_y": True}]])
                    fig_aud.add_trace(go.Scatter(x=daily_audience['Дата прослушивания'], y=daily_audience['Слушатели'],
                                                 name='Слушатели', line=dict(color='#F59E0B', width=3),
                                                 fill='tozeroy', fillcolor='rgba(245,158,11,0.08)',
                                                 mode='lines+markers', marker=dict(size=5, color='white',
                                                                                   line=dict(color='#F59E0B',
                                                                                             width=1.5))))
                    fig_aud.add_trace(go.Scatter(x=daily_audience['Дата прослушивания'], y=daily_audience['Часы'],
                                                 name='Часы', line=dict(color='#3B82F6', width=3),
                                                 fill='tozeroy', fillcolor='rgba(59,130,246,0.08)',
                                                 mode='lines+markers', marker=dict(size=5, color='white',
                                                                                   line=dict(color='#3B82F6',
                                                                                             width=1.5))),
                                      secondary_y=True)
                    fig_aud = add_important_dates_to_fig(fig_aud)
                    fig_aud.update_layout(
                        yaxis=dict(title='Слушатели', titlefont=dict(color='#F59E0B')),
                        yaxis2=dict(title='Часы', titlefont=dict(color='#3B82F6'),
                                    tickfont=dict(color='#3B82F6'), overlaying='y', side='right', showgrid=False)
                    )
                    st.plotly_chart(apply_plot_theme(fig_aud, 380), use_container_width=True)

            # Кривая жизни
            st.markdown("---")
            section_title("📈 Кривая жизни выпуска")
            show_hint("💡", "Как читать", "Показывает, как быстро выпуск набирает прослушивания.")

            life_curve = get_life_curve_for_period(selected_episode, df_merged, period_days=None)

            if life_curve is not None and not life_curve.empty:
                fig_life = go.Figure()
                fig_life.add_trace(go.Scatter(x=life_curve['День от релиза'], y=life_curve['Стримы_норм'],
                                              name='Стримы (накоплено)', line=dict(color='#EF4444', width=4),
                                              mode='lines+markers',
                                              marker=dict(size=6, color='white', line=dict(color='#EF4444', width=1.5)),
                                              fill='tozeroy', fillcolor='rgba(239,68,68,0.08)',
                                              hovertemplate='День %{x}: %{y:.1f}%<extra></extra>'))
                fig_life.add_trace(go.Scatter(x=life_curve['День от релиза'], y=life_curve['Стримы_накоп'],
                                              name='Стримы (абс.)', line=dict(color='#A78BFA', width=2, dash='dash'),
                                              mode='lines', yaxis='y2',
                                              hovertemplate='День %{x}: %{y:,.0f} стримов<extra></extra>'))
                if 'Часы_накоп' in life_curve.columns:
                    fig_life.add_trace(go.Scatter(x=life_curve['День от релиза'], y=life_curve['Часы_накоп'],
                                                  name='Часы (накопленные)',
                                                  line=dict(color='#3B82F6', width=2, dash='dot'),
                                                  mode='lines', yaxis='y2',
                                                  hovertemplate='День %{x}: %{y:,.0f} часов<extra></extra>'))

                try:
                    idx_50 = (life_curve['Стримы_норм'] >= 50).idxmax() if (
                                life_curve['Стримы_норм'] >= 50).any() else None
                    if idx_50 is not None:
                        day_50 = life_curve.loc[idx_50, 'День от релиза']
                        fig_life.add_annotation(x=day_50, y=50, text=f"⚡ 50% на день {int(day_50)}",
                                                showarrow=True, arrowhead=2, ax=20, ay=-30,
                                                font=dict(color='#F59E0B', size=9), arrowcolor='#F59E0B')
                    idx_90 = (life_curve['Стримы_норм'] >= 90).idxmax() if (
                                life_curve['Стримы_норм'] >= 90).any() else None
                    if idx_90 is not None:
                        day_90 = life_curve.loc[idx_90, 'День от релиза']
                        fig_life.add_annotation(x=day_90, y=90, text=f"🎯 90% на день {int(day_90)}",
                                                showarrow=True, arrowhead=2, ax=20, ay=30,
                                                font=dict(color='#22C55E', size=9), arrowcolor='#22C55E')
                except:
                    pass

                fig_life.update_layout(
                    yaxis=dict(title='% от всех стримов', range=[0, 105]),
                    yaxis2=dict(title='Абсолютные значения', titlefont=dict(color='#A78BFA'),
                                tickfont=dict(color='#71717A'), overlaying='y', side='right', showgrid=False),
                    xaxis=dict(title='День от релиза'),
                    hovermode='x unified',
                )
                st.plotly_chart(apply_plot_theme(fig_life, 380), use_container_width=True)

                col1, col2, col3 = st.columns(3)
                days_to_50 = life_curve[life_curve['Стримы_норм'] >= 50]['День от релиза'].min() if (
                            life_curve['Стримы_норм'] >= 50).any() else '∞'
                days_to_90 = life_curve[life_curve['Стримы_норм'] >= 90]['День от релиза'].min() if (
                            life_curve['Стримы_норм'] >= 90).any() else '∞'
                with col1:
                    st.metric("⏱️ Дней до 50% стримов", f"{days_to_50}" if days_to_50 != '∞' else "—")
                with col2:
                    st.metric("⏱️ Дней до 90% стримов", f"{days_to_90}" if days_to_90 != '∞' else "—")
                with col3:
                    if days_to_90 != '∞':
                        if days_to_90 <= 7:
                            status, color = "⚡ Молниеносный", "#EF4444"
                        elif days_to_90 <= 14:
                            status, color = "📈 Средний", "#F59E0B"
                        elif days_to_90 <= 30:
                            status, color = "🐢 Долгий", "#22C55E"
                        else:
                            status, color = "🌿 Вечнозеленый", "#7C3AED"
                    else:
                        status, color = "📊 Данных нет", "#71717A"
                    st.markdown(f"""
                    <div style="background:rgba(255,255,255,0.02);border:1px solid {color}44;border-radius:12px;padding:0.6rem;text-align:center;">
                        <div style="color:{color};font-weight:600;">{status}</div>
                    </div>
                    """, unsafe_allow_html=True)

            # Воронка
            st.markdown("---")
            section_title("📊 Воронка внимания")
            show_hint("💡", "Что показывает", "Сколько слушателей доходит до каждого этапа.")

            funnel_data = get_funnel_data(episode_data)

            if funnel_data['has_data']:
                stages = [
                    f'Старты<br>{funnel_data["stage_1"]:,.0f} чел.',
                    f'Средний %<br>{funnel_data["avg_listen"] * 100:.0f}% — {funnel_data["stage_2"]:,.0f} чел.',
                    f'Дослушали<br>{funnel_data["completion"] * 100:.0f}% — {funnel_data["stage_3"]:,.0f} чел.'
                ]
                values = [funnel_data['stage_1'], funnel_data['stage_2'], funnel_data['stage_3']]
                fig_funnel = plot_funnel(stages, values)
                st.plotly_chart(fig_funnel, use_container_width=True)

                st.markdown("---")
                col1, col2, col3 = st.columns(3)
                drop_1 = funnel_data['stage_1'] - funnel_data['stage_2']
                drop_1_pct = safe_div(drop_1, funnel_data['stage_1']) * 100
                drop_2 = funnel_data['stage_2'] - funnel_data['stage_3']
                drop_2_pct = safe_div(drop_2, funnel_data['stage_2']) * 100

                with col1:
                    if drop_1_pct > 30:
                        status, color = "⚠️ Высокая потеря", "#EF4444"
                    elif drop_1_pct > 15:
                        status, color = "📊 Средняя потеря", "#F59E0B"
                    else:
                        status, color = "✅ Отличное удержание", "#22C55E"
                    st.markdown(f"""
                    <div style="background:rgba(255,255,255,0.02);border:1px solid {color}44;border-radius:12px;padding:0.6rem;text-align:center;">
                        <div style="color:{color};font-weight:600;">{status}</div>
                        <div style="color:#71717A;font-size:0.7rem;">Потеря: {drop_1_pct:.0f}% ({drop_1:,.0f} чел.)</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col2:
                    if drop_2_pct > 30:
                        status, color = "⚠️ Провал в концовке", "#EF4444"
                    elif drop_2_pct > 15:
                        status, color = "📊 Слабая концовка", "#F59E0B"
                    else:
                        status, color = "✅ Сильная концовка", "#22C55E"
                    st.markdown(f"""
                    <div style="background:rgba(255,255,255,0.02);border:1px solid {color}44;border-radius:12px;padding:0.6rem;text-align:center;">
                        <div style="color:{color};font-weight:600;">{status}</div>
                        <div style="color:#71717A;font-size:0.7rem;">Потеря: {drop_2_pct:.0f}% ({drop_2:,.0f} чел.)</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col3:
                    if funnel_data['completion'] > 0.4:
                        verdict, color = "🏆 Отличный результат!", "#22C55E"
                    elif funnel_data['completion'] > 0.25:
                        verdict, color = "📊 Средний результат", "#F59E0B"
                    else:
                        verdict, color = "🔽 Требует улучшения", "#EF4444"
                    st.markdown(f"""
                    <div style="background:rgba(255,255,255,0.02);border:1px solid {color}44;border-radius:12px;padding:0.6rem;text-align:center;">
                        <div style="color:{color};font-weight:600;">{verdict}</div>
                        <div style="color:#71717A;font-size:0.7rem;">Дослушивают: {funnel_data["completion"] * 100:.0f}% ({funnel_data["stage_3"]:,.0f} чел.)</div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.warning("⚠️ Недостаточно данных для построения воронки внимания.")

# ============================================================
# СТРАНИЦА 3: СРАВНЕНИЕ ВЫПУСКОВ
# ============================================================
else:
    st.markdown(
        '<div style="font-size:1.8rem;font-weight:600;color:#FAFAFA;margin-bottom:0.3rem;">🔄 Сравнение двух выпусков</div>',
        unsafe_allow_html=True)
    important_dates_legend()

    period = st.radio(
        "📅 Выберите период анализа:",
        ["1 день", "1 неделя", "1 месяц", "Всё время"],
        horizontal=True,
        index=3,
        key="comparison_period"
    )

    col1, col2 = st.columns(2)
    with col1:
        ep1_short = st.selectbox("📌 Выпуск №1:", short_names_ordered, key="ep1")
        ep1 = episode_names_ordered[ep1_short]
        release_date1 = df_total[df_total['Выпуск'] == ep1]['Дата прослушивания'].min()
    with col2:
        ep2_short = st.selectbox("📌 Выпуск №2:", short_names_ordered, key="ep2")
        ep2 = episode_names_ordered[ep2_short]
        release_date2 = df_total[df_total['Выпуск'] == ep2]['Дата прослушивания'].min()

    if ep1 == ep2:
        st.warning("⚠️ Выберите два разных выпуска для сравнения!")
    else:
        all_data = df_merged.copy()

        if period == "1 день":
            data1 = all_data[(all_data['Выпуск'] == ep1) & (all_data['Дата прослушивания'] >= release_date1) & (
                        all_data['Дата прослушивания'] <= release_date1 + pd.Timedelta(days=0))]
            data2 = all_data[(all_data['Выпуск'] == ep2) & (all_data['Дата прослушивания'] >= release_date2) & (
                        all_data['Дата прослушивания'] <= release_date2 + pd.Timedelta(days=0))]
        elif period == "1 неделя":
            data1 = all_data[(all_data['Выпуск'] == ep1) & (all_data['Дата прослушивания'] >= release_date1) & (
                        all_data['Дата прослушивания'] <= release_date1 + pd.Timedelta(days=6))]
            data2 = all_data[(all_data['Выпуск'] == ep2) & (all_data['Дата прослушивания'] >= release_date2) & (
                        all_data['Дата прослушивания'] <= release_date2 + pd.Timedelta(days=6))]
        elif period == "1 месяц":
            data1 = all_data[(all_data['Выпуск'] == ep1) & (all_data['Дата прослушивания'] >= release_date1) & (
                        all_data['Дата прослушивания'] <= release_date1 + pd.Timedelta(days=29))]
            data2 = all_data[(all_data['Выпуск'] == ep2) & (all_data['Дата прослушивания'] >= release_date2) & (
                        all_data['Дата прослушивания'] <= release_date2 + pd.Timedelta(days=29))]
        else:
            data1 = all_data[all_data['Выпуск'] == ep1]
            data2 = all_data[all_data['Выпуск'] == ep2]

        if data1.empty or data2.empty:
            st.warning("⚠️ Нет данных для выбранных выпусков в этом периоде")
        else:
            total_starts1 = data1['Старты'].sum()
            total_streams1 = data1['Стримы'].sum()
            conv1 = safe_div(total_streams1, total_starts1) * 100
            rsi1 = data1['RSI'].mean()
            listeners1 = data1['Слушатели'].sum()
            hours1 = data1['Часы'].sum()

            total_starts2 = data2['Старты'].sum()
            total_streams2 = data2['Стримы'].sum()
            conv2 = safe_div(total_streams2, total_starts2) * 100
            rsi2 = data2['RSI'].mean()
            listeners2 = data2['Слушатели'].sum()
            hours2 = data2['Часы'].sum()

            section_title("📊 Сравнение метрик")

            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"""
                <div style="background:rgba(124,58,237,0.04);border:1px solid rgba(124,58,237,0.10);border-radius:16px;padding:1rem;margin-bottom:0.8rem;">
                    <h3 style="color:#7C3AED;text-align:center;margin:0;font-weight:500;font-size:1rem;">{ep1_short}</h3>
                </div>
                """, unsafe_allow_html=True)
                create_metric_row([
                    ("🎬", format_number(total_starts1), "Старты"),
                    ("🎧", format_number(total_streams1), "Стримы"),
                    ("📈", format_percent(conv1), "Конверсия"),
                    ("⭐", format_decimal(rsi1, 1), "RSI"),
                    ("👥", format_number(listeners1), "Слушатели"),
                    ("⏱", format_decimal(hours1, 1), "Часы"),
                ])

            with col2:
                st.markdown(f"""
                <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.10);border-radius:16px;padding:1rem;margin-bottom:0.8rem;">
                    <h3 style="color:#EF4444;text-align:center;margin:0;font-weight:500;font-size:1rem;">{ep2_short}</h3>
                </div>
                """, unsafe_allow_html=True)
                create_metric_row([
                    ("🎬", format_number(total_starts2), "Старты"),
                    ("🎧", format_number(total_streams2), "Стримы"),
                    ("📈", format_percent(conv2), "Конверсия"),
                    ("⭐", format_decimal(rsi2, 1), "RSI"),
                    ("👥", format_number(listeners2), "Слушатели"),
                    ("⏱", format_decimal(hours2, 1), "Часы"),
                ])

            # Динамика по дням
            st.markdown("---")
            section_title("📈 Динамика по дням от релиза")

            data1_copy = data1.copy()
            data2_copy = data2.copy()
            data1_copy['День от релиза'] = (data1_copy['Дата прослушивания'] - release_date1).dt.days + 1
            data2_copy['День от релиза'] = (data2_copy['Дата прослушивания'] - release_date2).dt.days + 1
            daily1 = data1_copy.groupby('День от релиза').agg({
                'Старты': 'sum', 'Стримы': 'sum', 'Слушатели': 'sum', 'Часы': 'sum'
            }).reset_index()
            daily2 = data2_copy.groupby('День от релиза').agg({
                'Старты': 'sum', 'Стримы': 'sum', 'Слушатели': 'sum', 'Часы': 'sum'
            }).reset_index()

            # Старты
            st.markdown(
                '<div style="color:#7C3AED;font-weight:600;font-size:0.85rem;padding:0.3rem 0;">🎬 Сравнение стартов</div>',
                unsafe_allow_html=True)
            fig_s = go.Figure()
            fig_s.add_trace(go.Scatter(x=daily1['День от релиза'], y=daily1['Старты'],
                                       name=f'{ep1_short}', line=dict(color='#7C3AED', width=3),
                                       mode='lines+markers',
                                       marker=dict(size=6, color='white', line=dict(color='#7C3AED', width=1.5)),
                                       fill='tozeroy', fillcolor='rgba(124,58,237,0.08)'))
            fig_s.add_trace(go.Scatter(x=daily2['День от релиза'], y=daily2['Старты'],
                                       name=f'{ep2_short}', line=dict(color='#EF4444', width=3),
                                       mode='lines+markers',
                                       marker=dict(size=6, color='white', line=dict(color='#EF4444', width=1.5)),
                                       fill='tozeroy', fillcolor='rgba(239,68,68,0.08)'))
            st.plotly_chart(apply_plot_theme(fig_s, 320), use_container_width=True)

            # Стримы
            st.markdown(
                '<div style="color:#EF4444;font-weight:600;font-size:0.85rem;padding:0.3rem 0;">🎧 Сравнение стримов</div>',
                unsafe_allow_html=True)
            fig_st = go.Figure()
            fig_st.add_trace(go.Scatter(x=daily1['День от релиза'], y=daily1['Стримы'],
                                        name=f'{ep1_short}', line=dict(color='#22C55E', width=3),
                                        mode='lines+markers',
                                        marker=dict(size=6, color='white', line=dict(color='#22C55E', width=1.5)),
                                        fill='tozeroy', fillcolor='rgba(34,197,94,0.08)'))
            fig_st.add_trace(go.Scatter(x=daily2['День от релиза'], y=daily2['Стримы'],
                                        name=f'{ep2_short}', line=dict(color='#A78BFA', width=3),
                                        mode='lines+markers',
                                        marker=dict(size=6, color='white', line=dict(color='#A78BFA', width=1.5)),
                                        fill='tozeroy', fillcolor='rgba(167,139,250,0.08)'))
            st.plotly_chart(apply_plot_theme(fig_st, 320), use_container_width=True)

            # Сравнение аудитории
            if 'Слушатели' in daily1.columns and 'Часы' in daily1.columns:
                st.markdown("---")
                section_title("👥 Сравнение аудитории")
                fig_aud_comp = make_subplots(specs=[[{"secondary_y": True}]])
                fig_aud_comp.add_trace(go.Scatter(x=daily1['День от релиза'], y=daily1['Слушатели'],
                                                  name=f'{ep1_short} (слушатели)', line=dict(color='#F59E0B', width=3),
                                                  mode='lines+markers', marker=dict(size=6, color='white',
                                                                                    line=dict(color='#F59E0B',
                                                                                              width=1.5)),
                                                  fill='tozeroy', fillcolor='rgba(245,158,11,0.08)'))
                fig_aud_comp.add_trace(go.Scatter(x=daily2['День от релиза'], y=daily2['Слушатели'],
                                                  name=f'{ep2_short} (слушатели)', line=dict(color='#F97316', width=3),
                                                  mode='lines+markers', marker=dict(size=6, color='white',
                                                                                    line=dict(color='#F97316',
                                                                                              width=1.5)),
                                                  fill='tozeroy', fillcolor='rgba(249,115,22,0.08)'))
                fig_aud_comp.add_trace(go.Scatter(x=daily1['День от релиза'], y=daily1['Часы'],
                                                  name=f'{ep1_short} (часы)',
                                                  line=dict(color='#3B82F6', width=2, dash='dash'),
                                                  mode='lines+markers', marker=dict(size=4, color='#3B82F6')),
                                       secondary_y=True)
                fig_aud_comp.add_trace(go.Scatter(x=daily2['День от релиза'], y=daily2['Часы'],
                                                  name=f'{ep2_short} (часы)',
                                                  line=dict(color='#60A5FA', width=2, dash='dash'),
                                                  mode='lines+markers', marker=dict(size=4, color='#60A5FA')),
                                       secondary_y=True)
                fig_aud_comp.update_layout(
                    yaxis=dict(title='Слушатели', titlefont=dict(color='#F59E0B')),
                    yaxis2=dict(title='Часы', titlefont=dict(color='#3B82F6'),
                                tickfont=dict(color='#3B82F6'), overlaying='y', side='right', showgrid=False)
                )
                st.plotly_chart(apply_plot_theme(fig_aud_comp, 380), use_container_width=True)

            # Сравнение кривых жизни
            st.markdown("---")
            section_title("📈 Сравнение кривых жизни")
            show_hint("💡", "Как сравнивать", "Чей график круче — тот быстрее взлетает. Чей длиннее — тот живет дольше.")

            life_curve1 = get_life_curve_for_period(ep1, df_merged, period_days=None)
            life_curve2 = get_life_curve_for_period(ep2, df_merged, period_days=None)

            if life_curve1 is not None and life_curve2 is not None and not life_curve1.empty and not life_curve2.empty:
                fig_cl = go.Figure()
                fig_cl.add_trace(go.Scatter(x=life_curve1['День от релиза'], y=life_curve1['Стримы_норм'],
                                            name=f'{ep1_short}', line=dict(color='#7C3AED', width=4),
                                            mode='lines+markers',
                                            marker=dict(size=6, color='white', line=dict(color='#7C3AED', width=1.5)),
                                            fill='tozeroy', fillcolor='rgba(124,58,237,0.08)'))
                fig_cl.add_trace(go.Scatter(x=life_curve2['День от релиза'], y=life_curve2['Стримы_норм'],
                                            name=f'{ep2_short}', line=dict(color='#EF4444', width=4),
                                            mode='lines+markers',
                                            marker=dict(size=6, color='white', line=dict(color='#EF4444', width=1.5)),
                                            fill='tozeroy', fillcolor='rgba(239,68,68,0.08)'))

                for y_val, color, label in [(50, '#F59E0B', '50%'), (90, '#22C55E', '90%')]:
                    fig_cl.add_hline(y=y_val, line_dash="dash", line_color=color, line_width=1.5,
                                     annotation_text=label, annotation_font=dict(color=color, size=8))

                fig_cl.update_layout(yaxis=dict(range=[0, 105]), xaxis=dict(title='День от релиза'))
                st.plotly_chart(apply_plot_theme(fig_cl, 380), use_container_width=True)

                st.markdown("---")
                section_title("📊 Сравнительная статистика")

                col1, col2, col3 = st.columns(3)
                days1_50 = life_curve1[life_curve1['Стримы_норм'] >= 50]['День от релиза'].min() if (
                            life_curve1['Стримы_норм'] >= 50).any() else None
                days2_50 = life_curve2[life_curve2['Стримы_норм'] >= 50]['День от релиза'].min() if (
                            life_curve2['Стримы_норм'] >= 50).any() else None
                days1_90 = life_curve1[life_curve1['Стримы_норм'] >= 90]['День от релиза'].min() if (
                            life_curve1['Стримы_норм'] >= 90).any() else None
                days2_90 = life_curve2[life_curve2['Стримы_норм'] >= 90]['День от релиза'].min() if (
                            life_curve2['Стримы_норм'] >= 90).any() else None

                with col1:
                    if days1_50 and days2_50:
                        faster = "1️⃣" if days1_50 < days2_50 else "2️⃣" if days2_50 < days1_50 else "🤝"
                        st.markdown(f"""
                        <div class="verdict" style="border-color:rgba(124,58,237,0.15);">
                            <div class="title" style="color:#7C3AED;">⏱️ Дней до 50% {faster}</div>
                            <div class="value" style="font-size:0.9rem;">
                                {ep1_short}: <span style="color:#7C3AED;">{days1_50} дн.</span><br>
                                {ep2_short}: <span style="color:#EF4444;">{days2_50} дн.</span>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                with col2:
                    if days1_90 and days2_90:
                        longer = "1️⃣" if days1_90 > days2_90 else "2️⃣" if days2_90 > days1_90 else "🤝"
                        st.markdown(f"""
                        <div class="verdict" style="border-color:rgba(34,197,94,0.15);">
                            <div class="title" style="color:#22C55E;">⏱️ Дней до 90% {longer}</div>
                            <div class="value" style="font-size:0.9rem;">
                                {ep1_short}: <span style="color:#7C3AED;">{days1_90} дн.</span><br>
                                {ep2_short}: <span style="color:#EF4444;">{days2_90} дн.</span>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                with col3:
                    if len(life_curve1) >= 3 and len(life_curve2) >= 3:
                        slope1 = (life_curve1['Стримы_норм'].iloc[2] - life_curve1['Стримы_норм'].iloc[0]) / 2
                        slope2 = (life_curve2['Стримы_норм'].iloc[2] - life_curve2['Стримы_норм'].iloc[0]) / 2
                        faster_start = "1️⃣" if slope1 > slope2 else "2️⃣" if slope2 > slope1 else "🤝"
                        st.markdown(f"""
                        <div class="verdict" style="border-color:rgba(245,158,11,0.15);">
                            <div class="title" style="color:#F59E0B;">🚀 Скорость старта {faster_start}</div>
                            <div class="value" style="font-size:0.9rem;">
                                {ep1_short}: <span style="color:#7C3AED;">{slope1:.1f}%/день</span><br>
                                {ep2_short}: <span style="color:#EF4444;">{slope2:.1f}%/день</span>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)

                st.markdown("---")
                section_title("💡 Вывод")

                col1, col2, col3 = st.columns([1, 1, 2])
                with col1:
                    st.markdown(f"""
                    <div class="verdict">
                        <div class="title" style="color:#7C3AED;">⭐ {ep1_short}</div>
                        <div class="desc">Скорость: {slope1:.1f}%/день</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col2:
                    st.markdown(f"""
                    <div class="verdict">
                        <div class="title" style="color:#EF4444;">⭐ {ep2_short}</div>
                        <div class="desc">Скорость: {slope2:.1f}%/день</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col3:
                    if days1_50 and days2_50 and days1_90 and days2_90:
                        if days1_50 < days2_50 and days1_90 < days2_90:
                            winner, color, detail = ep1_short, "#22C55E", "быстрее набирает, но быстрее выдыхается"
                        elif days1_50 > days2_50 and days1_90 > days2_90:
                            winner, color, detail = ep2_short, "#22C55E", "быстрее набирает, но быстрее выдыхается"
                        elif days1_50 < days2_50 and days1_90 > days2_90:
                            winner, color, detail = ep1_short, "#F59E0B", "взлетает быстрее и живет дольше — идеал!"
                        elif days1_50 > days2_50 and days1_90 < days2_90:
                            winner, color, detail = ep2_short, "#F59E0B", "взлетает быстрее и живет дольше — идеал!"
                        else:
                            winner, color, detail = "Ничья", "#7C3AED", "разные паттерны, смотрите график"
                        st.markdown(f"""
                        <div class="verdict" style="border-color:{color}44;">
                            <div class="title" style="color:{color};">🏆 Победитель</div>
                            <div class="value" style="color:{color};">{winner}</div>
                            <div class="desc">{detail}</div>
                        </div>
                        """, unsafe_allow_html=True)

            # Сравнение воронок
            st.markdown("---")
            section_title("📊 Сравнение воронок внимания")
            show_hint("💡", "Что сравниваем", "Потери аудитории на каждом этапе.")

            funnel1 = get_funnel_data(data1)
            funnel2 = get_funnel_data(data2)

            if funnel1['has_data'] and funnel2['has_data']:
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown(f"""
                    <div style="background:rgba(124,58,237,0.04);border:1px solid rgba(124,58,237,0.08);border-radius:10px;padding:0.2rem;text-align:center;margin-bottom:0.3rem;">
                        <h4 style="color:#7C3AED;margin:0.2rem;font-weight:500;font-size:0.85rem;">{ep1_short}</h4>
                    </div>
                    """, unsafe_allow_html=True)
                    stages1 = [
                        f'Старты<br>{funnel1["stage_1"]:,.0f}',
                        f'Средний %<br>{funnel1["avg_listen"] * 100:.0f}%',
                        f'Дослушали<br>{funnel1["completion"] * 100:.0f}%'
                    ]
                    values1 = [funnel1['stage_1'], funnel1['stage_2'], funnel1['stage_3']]
                    st.plotly_chart(plot_funnel(stages1, values1, 320), use_container_width=True)

                with col2:
                    st.markdown(f"""
                    <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.08);border-radius:10px;padding:0.2rem;text-align:center;margin-bottom:0.3rem;">
                        <h4 style="color:#EF4444;margin:0.2rem;font-weight:500;font-size:0.85rem;">{ep2_short}</h4>
                    </div>
                    """, unsafe_allow_html=True)
                    stages2 = [
                        f'Старты<br>{funnel2["stage_1"]:,.0f}',
                        f'Средний %<br>{funnel2["avg_listen"] * 100:.0f}%',
                        f'Дослушали<br>{funnel2["completion"] * 100:.0f}%'
                    ]
                    values2 = [funnel2['stage_1'], funnel2['stage_2'], funnel2['stage_3']]
                    st.plotly_chart(plot_funnel(stages2, values2, 320), use_container_width=True)

                st.markdown("---")
                section_title("📉 Сравнение потерь аудитории")

                drop1_1 = funnel1['stage_1'] - funnel1['stage_2']
                drop1_1_pct = safe_div(drop1_1, funnel1['stage_1']) * 100
                drop1_2 = funnel1['stage_2'] - funnel1['stage_3']
                drop1_2_pct = safe_div(drop1_2, funnel1['stage_2']) * 100
                drop2_1 = funnel2['stage_1'] - funnel2['stage_2']
                drop2_1_pct = safe_div(drop2_1, funnel2['stage_1']) * 100
                drop2_2 = funnel2['stage_2'] - funnel2['stage_3']
                drop2_2_pct = safe_div(drop2_2, funnel2['stage_2']) * 100

                comparison_data = pd.DataFrame({
                    'Показатель': [
                        'Старты (всего)',
                        'Средний % прослушивания',
                        'Дослушиваемость',
                        'Потеря: Старты → Средний %',
                        'Потеря: Средний % → Дослушивание',
                        'Общая потеря'
                    ],
                    ep1_short: [
                        f"{funnel1['stage_1']:,.0f}",
                        f"{funnel1['avg_listen'] * 100:.1f}%",
                        f"{funnel1['completion'] * 100:.1f}%",
                        f"{drop1_1:,.0f} ({drop1_1_pct:.1f}%)",
                        f"{drop1_2:,.0f} ({drop1_2_pct:.1f}%)",
                        f"{funnel1['stage_1'] - funnel1['stage_3']:,.0f} ({100 - funnel1['completion'] * 100:.1f}%)"
                    ],
                    ep2_short: [
                        f"{funnel2['stage_1']:,.0f}",
                        f"{funnel2['avg_listen'] * 100:.1f}%",
                        f"{funnel2['completion'] * 100:.1f}%",
                        f"{drop2_1:,.0f} ({drop2_1_pct:.1f}%)",
                        f"{drop2_2:,.0f} ({drop2_2_pct:.1f}%)",
                        f"{funnel2['stage_1'] - funnel2['stage_3']:,.0f} ({100 - funnel2['completion'] * 100:.1f}%)"
                    ]
                })
                st.dataframe(comparison_data, use_container_width=True)

                st.markdown("---")
                col1, col2, col3 = st.columns(3)
                with col1:
                    if funnel1['completion'] > funnel2['completion']:
                        winner, color = ep1_short, "#7C3AED"
                    elif funnel2['completion'] > funnel1['completion']:
                        winner, color = ep2_short, "#EF4444"
                    else:
                        winner, color = "Ничья", "#F59E0B"
                    st.markdown(f"""
                    <div class="verdict" style="border-color:{color}44;">
                        <div class="title" style="color:{color};">🏆 Удержание</div>
                        <div class="value" style="color:{color};font-size:1rem;">{winner}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col2:
                    if drop1_1_pct < drop2_1_pct:
                        better, color = ep1_short, "#7C3AED"
                    elif drop2_1_pct < drop1_1_pct:
                        better, color = ep2_short, "#EF4444"
                    else:
                        better, color = "Ничья", "#F59E0B"
                    st.markdown(f"""
                    <div class="verdict" style="border-color:{color}44;">
                        <div class="title" style="color:{color};">🎯 Старт</div>
                        <div class="value" style="color:{color};font-size:1rem;">{better}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with col3:
                    if drop1_2_pct < drop2_2_pct:
                        better, color = ep1_short, "#22C55E"
                    elif drop2_2_pct < drop1_2_pct:
                        better, color = ep2_short, "#22C55E"
                    else:
                        better, color = "Ничья", "#F59E0B"
                    st.markdown(f"""
                    <div class="verdict" style="border-color:{color}44;">
                        <div class="title" style="color:{color};">🏁 Концовка</div>
                        <div class="value" style="color:{color};font-size:1rem;">{better}</div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.warning("⚠️ Недостаточно данных для сравнения воронок внимания.")

            # Итоговый вердикт
            st.markdown("---")
            section_title("🏆 Итоговый вердикт по RSI")
            show_hint("💡", "Что это", "Сравнение двух выпусков по главной метрике.")

            col1, col2, col3 = st.columns([1, 1, 2])
            with col1:
                st.markdown(f"""
                <div class="verdict">
                    <div class="title" style="color:#7C3AED;">⭐ RSI {ep1_short}</div>
                    <div class="value">{rsi1:.1f}</div>
                </div>
                """, unsafe_allow_html=True)
            with col2:
                st.markdown(f"""
                <div class="verdict">
                    <div class="title" style="color:#EF4444;">⭐ RSI {ep2_short}</div>
                    <div class="value">{rsi2:.1f}</div>
                </div>
                """, unsafe_allow_html=True)
            with col3:
                if rsi1 > rsi2 * 1.05:
                    st.markdown(f"""
                    <div class="verdict" style="border-color:#22C55E44;">
                        <div class="title" style="color:#22C55E;">🏆 Победитель</div>
                        <div class="value" style="color:#22C55E;">{ep1_short}</div>
                        <div class="desc">значительно лучше по RSI!</div>
                    </div>
                    """, unsafe_allow_html=True)
                elif rsi1 > rsi2:
                    st.markdown(f"""
                    <div class="verdict" style="border-color:#7C3AED44;">
                        <div class="title" style="color:#7C3AED;">🏆 Победитель</div>
                        <div class="value" style="color:#7C3AED;">{ep1_short}</div>
                        <div class="desc">лучше по RSI!</div>
                    </div>
                    """, unsafe_allow_html=True)
                elif rsi2 > rsi1 * 1.05:
                    st.markdown(f"""
                    <div class="verdict" style="border-color:#22C55E44;">
                        <div class="title" style="color:#22C55E;">🏆 Победитель</div>
                        <div class="value" style="color:#22C55E;">{ep2_short}</div>
                        <div class="desc">значительно лучше по RSI!</div>
                    </div>
                    """, unsafe_allow_html=True)
                elif rsi2 > rsi1:
                    st.markdown(f"""
                    <div class="verdict" style="border-color:#EF444444;">
                        <div class="title" style="color:#EF4444;">🏆 Победитель</div>
                        <div class="value" style="color:#EF4444;">{ep2_short}</div>
                        <div class="desc">лучше по RSI!</div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="verdict" style="border-color:#F59E0B44;">
                        <div class="title" style="color:#F59E0B;">🤝 Ничья</div>
                        <div class="desc">выпуски примерно равны по RSI!</div>
                    </div>
                    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown(
        """<div class="footer">🎙️ Подкаст Аналитика Pro • Премиум дашборд • Данные обновляются автоматически</div>""",
        unsafe_allow_html=True)
