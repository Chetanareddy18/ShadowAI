"""
Shadow AI – Security Dashboard  (Phase 3)

6-tab analytics dashboard:
  Tab 1 – Overview          (KPIs, exec summary, decision/risk charts)
  Tab 2 – Threat Feed       (real-time blocked/critical events)
  Tab 3 – Topic Analysis    (domain distribution, risk multipliers)
  Tab 4 – User Behaviour    (anomaly events, per-user risk profile)
  Tab 5 – Time-Series       (trends over time, hourly heatmap)
  Tab 6 – Org Comparison    (multi-org metrics)

Run with:  streamlit run dashboard.py
"""
import json
import os
import sys

import pandas as pd
import plotly.express as px
import streamlit as st

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Shadow AI – Security Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

_project_root = os.path.dirname(os.path.abspath(__file__))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


# ── Data loaders ──────────────────────────────────────────────────────────────

@st.cache_data(ttl=15)
def load_audit_data() -> pd.DataFrame:
    """Try SQLite first, fall back to audit_log.json."""
    try:
        from sqlalchemy import create_engine
        db_url = os.getenv("SHADOW_DB_URL", "sqlite:///./shadow_audit.db")
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        df = pd.read_sql("SELECT * FROM audit_logs ORDER BY timestamp DESC", engine)
        if not df.empty:
            return df
    except Exception:
        pass

    records = []
    log_file = os.path.join(_project_root, "audit_log.json")
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    return pd.DataFrame(records) if records else pd.DataFrame()


@st.cache_data(ttl=15)
def load_anomaly_data() -> pd.DataFrame:
    try:
        from sqlalchemy import create_engine
        db_url = os.getenv("SHADOW_DB_URL", "sqlite:///./shadow_audit.db")
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        df = pd.read_sql("SELECT * FROM anomaly_events ORDER BY timestamp DESC", engine)
        return df
    except Exception:
        return pd.DataFrame()


def normalize_col(value):
    if isinstance(value, (dict, list, tuple, set)):
        return json.dumps(value, ensure_ascii=False)
    return value


# ── Sidebar ───────────────────────────────────────────────────────────────────
st.sidebar.title("🛡️ Shadow AI")
st.sidebar.caption("Enterprise AI Security Gateway")

if st.sidebar.button("🔄 Refresh Data"):
    st.cache_data.clear()
    st.rerun()

st.sidebar.divider()
org_filter = st.sidebar.text_input("Filter by Org ID", value="")
user_filter = st.sidebar.text_input("Filter by User ID", value="")
date_range = st.sidebar.slider(
    "Days to show",
    min_value=1,
    max_value=90,
    value=30,
)

# ── Load data ─────────────────────────────────────────────────────────────────
df_raw = load_audit_data()
df_anomaly = load_anomaly_data()

st.title("🛡️  Shadow AI — Security Dashboard")
st.caption("Real-time visibility into every AI prompt processed by your organisation.")

if df_raw.empty:
    st.warning("No audit data yet. Send a prompt through the gateway to see events here.")
    st.stop()

# ── Pre-process ───────────────────────────────────────────────────────────────
df = df_raw.copy()
if "timestamp" in df.columns:
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    cutoff = pd.Timestamp.utcnow().tz_localize(None) - pd.Timedelta(days=date_range)
    df = df[df["timestamp"] >= cutoff]

if org_filter:
    df = df[df["org_id"].astype(str).str.contains(org_filter, case=False, na=False)]
if user_filter:
    df = df[df["user_id"].astype(str).str.contains(user_filter, case=False, na=False)]

# ── Derived columns ───────────────────────────────────────────────────────────
total     = len(df)
blocked   = int((df["decision"] == "BLOCK").sum())   if "decision"   in df.columns else 0
sanitized = int((df["decision"] == "SANITIZE").sum()) if "decision"   in df.columns else 0
allowed   = int((df["decision"] == "ALLOW").sum())    if "decision"   in df.columns else 0
critical  = int((df["risk_level"] == "CRITICAL").sum()) if "risk_level" in df.columns else 0
anomaly_count = len(df_anomaly)

DECISION_COLORS = {"BLOCK": "#ef4444", "SANITIZE": "#f59e0b", "ALLOW": "#22c55e", "PASSTHROUGH": "#3b82f6"}
RISK_COLORS = {"CRITICAL": "#dc2626", "HIGH": "#ea580c", "MEDIUM": "#ca8a04", "LOW": "#16a34a"}
TOPIC_COLORS = {
    "MEDICAL": "#8b5cf6", "FINANCIAL": "#0ea5e9", "LEGAL": "#f97316",
    "HR": "#ec4899", "CODE": "#14b8a6", "INTELLECTUAL_IP": "#ef4444",
    "CUSTOMER_DATA": "#f59e0b", "GENERAL": "#6b7280",
}

# ═══════════════════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════════════════
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📊 Overview",
    "🚨 Threat Feed",
    "🏷️ Topics",
    "👤 User Behaviour",
    "📈 Time-Series",
    "🏢 Org Comparison",
])


# ─────────────────────────────────────────────────────────────────
# TAB 1 – OVERVIEW
# ─────────────────────────────────────────────────────────────────
with tab1:
    st.subheader("Security KPIs")
    k1, k2, k3, k4, k5, k6 = st.columns(6)
    k1.metric("Total Prompts", total)
    k2.metric("🚫 Blocked", blocked,
              delta=f"{round(blocked/total*100)}%" if total else "0%",
              delta_color="inverse")
    k3.metric("✂️ Sanitized", sanitized,
              delta=f"{round(sanitized/total*100)}%" if total else "0%",
              delta_color="inverse")
    k4.metric("✅ Allowed", allowed)
    k5.metric("🔴 Critical", critical, delta_color="inverse")
    k6.metric("⚠️ Anomalies", anomaly_count, delta_color="inverse")

    st.divider()

    # Executive impact row
    st.subheader("Executive Impact")
    leaks_prevented = blocked + sanitized
    active_users = df["user_id"].nunique() if "user_id" in df.columns else 0
    block_rate = round(blocked / total * 100, 1) if total else 0.0

    e1, e2, e3, e4 = st.columns(4)
    e1.metric("Data Leaks Prevented", leaks_prevented)
    e2.metric("Block Rate", f"{block_rate}%")
    e3.metric("Active Users", active_users)
    e4.metric("Avg Prompt Length",
              int(df["prompt_length"].mean()) if "prompt_length" in df.columns else "—")

    st.divider()
    c1, c2 = st.columns(2)

    with c1:
        st.markdown("**Decision Breakdown**")
        if "decision" in df.columns:
            dec_counts = df["decision"].value_counts().reset_index()
            dec_counts.columns = ["Decision", "Count"]
            fig = px.pie(dec_counts, names="Decision", values="Count",
                         color="Decision", color_discrete_map=DECISION_COLORS, hole=0.45)
            fig.update_layout(margin=dict(t=0, b=0, l=0, r=0))
            st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.markdown("**Risk Level Distribution**")
        if "risk_level" in df.columns:
            risk_counts = df["risk_level"].value_counts().reset_index()
            risk_counts.columns = ["Risk Level", "Count"]
            fig2 = px.bar(risk_counts, x="Risk Level", y="Count",
                          color="Risk Level", color_discrete_map=RISK_COLORS)
            fig2.update_layout(margin=dict(t=0, b=0), showlegend=False)
            st.plotly_chart(fig2, use_container_width=True)

    # Semantic injection score distribution (Phase 3)
    if "semantic_injection_score" in df.columns:
        st.divider()
        st.markdown("**Semantic Injection Score Distribution**")
        scores = pd.to_numeric(df["semantic_injection_score"], errors="coerce").dropna()
        if not scores.empty:
            fig_sem = px.histogram(scores, nbins=30, labels={"value": "Score", "count": "Frequency"},
                                   color_discrete_sequence=["#ef4444"])
            fig_sem.add_vline(x=0.35, line_dash="dash", line_color="orange",
                              annotation_text="Detection threshold (0.35)")
            fig_sem.update_layout(margin=dict(t=0, b=0), showlegend=False)
            st.plotly_chart(fig_sem, use_container_width=True)


# ─────────────────────────────────────────────────────────────────
# TAB 2 – THREAT FEED
# ─────────────────────────────────────────────────────────────────
with tab2:
    st.subheader("Real-Time Threat Feed")
    st.caption("Most recent BLOCK / CRITICAL events — auto-refreshes every 15 s (press Refresh in sidebar).")

    threat_df = df[df["decision"] == "BLOCK"].copy() if "decision" in df.columns else pd.DataFrame()

    if threat_df.empty:
        st.success("No blocked events in the selected period.")
    else:
        cols_to_show = [c for c in
            ["timestamp", "user_id", "org_id", "risk_level", "topic",
             "findings", "semantic_injection_score", "is_anomalous"]
            if c in threat_df.columns]
        if "findings" in cols_to_show:
            threat_df["findings"] = threat_df["findings"].apply(normalize_col)
        st.dataframe(
            threat_df[cols_to_show].head(100).reset_index(drop=True),
            use_container_width=True,
        )

    st.divider()
    st.subheader("Anomaly Events")
    if df_anomaly.empty:
        st.info("No anomaly events recorded yet.")
    else:
        show_cols = [c for c in
            ["timestamp", "user_id", "org_id", "anomaly_score", "anomaly_reason", "method"]
            if c in df_anomaly.columns]
        st.dataframe(df_anomaly[show_cols].head(50).reset_index(drop=True), use_container_width=True)

    st.divider()
    st.subheader("Top Blocked Users")
    if "user_id" in threat_df.columns:
        top_blocked = (
            threat_df.groupby("user_id").size()
            .reset_index(name="blocked_count")
            .sort_values("blocked_count", ascending=False)
            .head(10)
        )
        fig_tb = px.bar(top_blocked, x="user_id", y="blocked_count",
                        color_discrete_sequence=["#ef4444"])
        fig_tb.update_layout(margin=dict(t=0, b=0), xaxis_title="User", yaxis_title="Blocked Requests")
        st.plotly_chart(fig_tb, use_container_width=True)


# ─────────────────────────────────────────────────────────────────
# TAB 3 – TOPICS
# ─────────────────────────────────────────────────────────────────
with tab3:
    st.subheader("Topic / Domain Analysis")

    if "topic" not in df.columns or df["topic"].isna().all():
        st.info("No topic data yet. Phase 3 topic classifier enriches data once deployed.")
    else:
        t_df = df.copy()
        t_df["topic"] = t_df["topic"].fillna("GENERAL")

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Topic Distribution**")
            topic_counts = t_df["topic"].value_counts().reset_index()
            topic_counts.columns = ["Topic", "Count"]
            fig_t = px.pie(topic_counts, names="Topic", values="Count",
                           color="Topic", color_discrete_map=TOPIC_COLORS, hole=0.4)
            fig_t.update_layout(margin=dict(t=0, b=0, l=0, r=0))
            st.plotly_chart(fig_t, use_container_width=True)

        with c2:
            st.markdown("**Block Rate by Topic**")
            if "decision" in t_df.columns:
                grp = t_df.groupby("topic").apply(
                    lambda x: pd.Series({
                        "total": len(x),
                        "blocked": (x["decision"] == "BLOCK").sum(),
                    })
                ).reset_index()
                grp["block_rate"] = (grp["blocked"] / grp["total"] * 100).round(1)
                grp = grp.sort_values("block_rate", ascending=True)
                fig_br = px.bar(grp, y="topic", x="block_rate", orientation="h",
                                color="block_rate",
                                color_continuous_scale=["#22c55e", "#f59e0b", "#ef4444"],
                                labels={"block_rate": "Block Rate (%)"})
                fig_br.update_layout(margin=dict(t=0, b=0), coloraxis_showscale=False)
                st.plotly_chart(fig_br, use_container_width=True)

        st.divider()
        st.markdown("**Risk Multiplier Heatmap** (average applied multiplier per topic × org)")
        if "topic_risk_multiplier" in t_df.columns and "org_id" in t_df.columns:
            t_df["topic_risk_multiplier"] = pd.to_numeric(
                t_df["topic_risk_multiplier"], errors="coerce"
            )
            pivot = (
                t_df.groupby(["org_id", "topic"])["topic_risk_multiplier"]
                .mean()
                .unstack(fill_value=1.0)
            )
            if not pivot.empty:
                fig_h = px.imshow(
                    pivot,
                    color_continuous_scale="RdYlGn_r",
                    text_auto=".1f",
                    aspect="auto",
                    labels={"color": "Avg Multiplier"},
                )
                fig_h.update_layout(margin=dict(t=0, b=0))
                st.plotly_chart(fig_h, use_container_width=True)


# ─────────────────────────────────────────────────────────────────
# TAB 4 – USER BEHAVIOUR
# ─────────────────────────────────────────────────────────────────
with tab4:
    st.subheader("User Behaviour & Anomaly Detection")

    if "user_id" not in df.columns:
        st.info("No user data available.")
    else:
        user_stats = (
            df.groupby("user_id")
            .agg(
                total_requests=("decision", "count"),
                blocked=("decision", lambda x: (x == "BLOCK").sum()),
                critical=("risk_level", lambda x: (x == "CRITICAL").sum()),
            )
            .reset_index()
        )
        user_stats["block_rate"] = (
            user_stats["blocked"] / user_stats["total_requests"] * 100
        ).round(1)
        user_stats = user_stats.sort_values("blocked", ascending=False)

        st.markdown("**Per-User Risk Summary**")
        st.dataframe(user_stats.head(20), use_container_width=True)

        st.divider()

        # Anomaly timeline
        if not df_anomaly.empty and "timestamp" in df_anomaly.columns:
            st.markdown("**Anomaly Events Timeline**")
            df_anomaly["timestamp"] = pd.to_datetime(df_anomaly["timestamp"], errors="coerce")
            df_anomaly["anomaly_score_numeric"] = pd.to_numeric(
                df_anomaly["anomaly_score"], errors="coerce"
            )
            fig_at = px.scatter(
                df_anomaly.dropna(subset=["timestamp", "anomaly_score_numeric"]),
                x="timestamp",
                y="anomaly_score_numeric",
                color="user_id" if "user_id" in df_anomaly.columns else None,
                hover_data=["anomaly_reason"] if "anomaly_reason" in df_anomaly.columns else None,
                labels={"anomaly_score_numeric": "Anomaly Score", "timestamp": "Time"},
            )
            fig_at.update_layout(margin=dict(t=0, b=0))
            st.plotly_chart(fig_at, use_container_width=True)
        else:
            st.info("No anomaly events to display yet.")

        st.divider()
        st.markdown("**Request Volume Heatmap (User × Hour)**")
        if "timestamp" in df.columns:
            df_copy = df.copy()
            df_copy["hour"] = df_copy["timestamp"].dt.hour
            pivot_uh = (
                df_copy.groupby(["user_id", "hour"]).size()
                .unstack(fill_value=0)
            )
            if not pivot_uh.empty and len(pivot_uh) <= 30:
                fig_uhr = px.imshow(
                    pivot_uh,
                    labels={"x": "Hour of Day", "y": "User", "color": "Requests"},
                    color_continuous_scale="Blues",
                    aspect="auto",
                )
                fig_uhr.update_layout(margin=dict(t=0, b=0))
                st.plotly_chart(fig_uhr, use_container_width=True)


# ─────────────────────────────────────────────────────────────────
# TAB 5 – TIME-SERIES
# ─────────────────────────────────────────────────────────────────
with tab5:
    st.subheader("Time-Series Trends")

    if "timestamp" not in df.columns or df["timestamp"].isna().all():
        st.info("No timestamp data available.")
    else:
        ts_df = df.copy()
        ts_df["date"] = ts_df["timestamp"].dt.date

        daily = (
            ts_df.groupby(["date", "decision"])
            .size()
            .reset_index(name="count")
        ) if "decision" in ts_df.columns else pd.DataFrame()

        if not daily.empty:
            st.markdown("**Daily Request Volume by Decision**")
            fig_daily = px.area(
                daily,
                x="date",
                y="count",
                color="decision",
                color_discrete_map=DECISION_COLORS,
                labels={"count": "Requests", "date": "Date"},
            )
            fig_daily.update_layout(margin=dict(t=0, b=0))
            st.plotly_chart(fig_daily, use_container_width=True)

        st.divider()

        st.markdown("**Hourly Request Heatmap (Day of Week × Hour)**")
        ts_df["day_of_week"] = ts_df["timestamp"].dt.day_name()
        ts_df["hour"] = ts_df["timestamp"].dt.hour
        pivot_hm = (
            ts_df.groupby(["day_of_week", "hour"])
            .size()
            .unstack(fill_value=0)
        )
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        pivot_hm = pivot_hm.reindex([d for d in day_order if d in pivot_hm.index])
        if not pivot_hm.empty:
            fig_hm = px.imshow(
                pivot_hm,
                labels={"x": "Hour", "y": "Day", "color": "Requests"},
                color_continuous_scale="YlOrRd",
                aspect="auto",
            )
            fig_hm.update_layout(margin=dict(t=0, b=0))
            st.plotly_chart(fig_hm, use_container_width=True)

        st.divider()
        st.markdown("**Rolling 7-Day Block Rate (%)**")
        if "decision" in ts_df.columns:
            daily_grp = ts_df.groupby("date").agg(
                total=("decision", "count"),
                blocked=("decision", lambda x: (x == "BLOCK").sum()),
            ).reset_index()
            daily_grp["block_rate"] = (daily_grp["blocked"] / daily_grp["total"] * 100).round(1)
            daily_grp = daily_grp.sort_values("date")
            daily_grp["rolling_block_rate"] = daily_grp["block_rate"].rolling(7, min_periods=1).mean()
            fig_roll = px.line(
                daily_grp,
                x="date",
                y="rolling_block_rate",
                labels={"rolling_block_rate": "Block Rate (%) 7-day MA", "date": "Date"},
                color_discrete_sequence=["#ef4444"],
            )
            fig_roll.update_layout(margin=dict(t=0, b=0))
            st.plotly_chart(fig_roll, use_container_width=True)


# ─────────────────────────────────────────────────────────────────
# TAB 6 – ORG COMPARISON
# ─────────────────────────────────────────────────────────────────
with tab6:
    st.subheader("Organisation Comparison")

    if "org_id" not in df.columns or df["org_id"].nunique() < 2:
        st.info(
            "Only one organisation detected. "
            "Org comparison becomes available once you have multiple organisations using the gateway."
        )
    else:
        org_stats = (
            df.groupby("org_id")
            .agg(
                total=("decision", "count"),
                blocked=("decision", lambda x: (x == "BLOCK").sum()),
                sanitized=("decision", lambda x: (x == "SANITIZE").sum()),
                critical=("risk_level", lambda x: (x == "CRITICAL").sum()),
                unique_users=("user_id", "nunique"),
            )
            .reset_index()
        )
        org_stats["block_rate"] = (org_stats["blocked"] / org_stats["total"] * 100).round(1)

        st.markdown("**Organisation Risk Scorecard**")
        st.dataframe(org_stats, use_container_width=True)

        st.divider()
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Request Volume by Org**")
            fig_org_vol = px.bar(
                org_stats.sort_values("total", ascending=True),
                y="org_id",
                x="total",
                orientation="h",
                color_discrete_sequence=["#3b82f6"],
            )
            fig_org_vol.update_layout(margin=dict(t=0, b=0), xaxis_title="Total Requests", yaxis_title="")
            st.plotly_chart(fig_org_vol, use_container_width=True)

        with c2:
            st.markdown("**Block Rate by Org**")
            fig_org_br = px.bar(
                org_stats.sort_values("block_rate", ascending=True),
                y="org_id",
                x="block_rate",
                orientation="h",
                color="block_rate",
                color_continuous_scale=["#22c55e", "#f59e0b", "#ef4444"],
                labels={"block_rate": "Block Rate (%)"},
            )
            fig_org_br.update_layout(margin=dict(t=0, b=0), coloraxis_showscale=False, yaxis_title="")
            st.plotly_chart(fig_org_br, use_container_width=True)

        if "topic" in df.columns:
            st.divider()
            st.markdown("**Topic Mix Comparison (stacked %)**")
            tp_org = (
                df.groupby(["org_id", "topic"]).size()
                .reset_index(name="count")
            )
            tp_org["topic"] = tp_org["topic"].fillna("GENERAL")
            fig_tp = px.bar(
                tp_org,
                x="org_id",
                y="count",
                color="topic",
                barmode="stack",
                color_discrete_map=TOPIC_COLORS,
                labels={"count": "Requests", "org_id": "Organisation"},
            )
            fig_tp.update_layout(margin=dict(t=0, b=0))
            st.plotly_chart(fig_tp, use_container_width=True)

# ── Footer ────────────────────────────────────────────────────────────────────
st.sidebar.divider()
st.sidebar.caption(f"Data range: last {date_range} days | {total:,} events")

