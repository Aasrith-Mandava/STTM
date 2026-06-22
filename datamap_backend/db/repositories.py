from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, func, desc, union_all, exists, or_
from sqlalchemy.orm import Session

from db.models import AppSession, ExtractRun, MappingReviewDraft, MappingRun, ProfilingRun
from utils.gcs_artifact_utils import make_json_compatible


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class AppSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_sessions(self, *, user_key: str) -> list[AppSession]:
        stmt = (
            select(AppSession)
            .where(AppSession.user_key == user_key, AppSession.deleted_at.is_(None))
            .order_by(AppSession.updated_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_session(self, *, session_id: str, user_key: str) -> AppSession | None:
        stmt = select(AppSession).where(
            AppSession.id == session_id,
            AppSession.user_key == user_key,
            AppSession.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def create_session(
        self,
        *,
        user_key: str,
        user_email: str | None,
        title: str | None,
        runtime: dict[str, str] | None = None,
        id_prefix: str = "sess",
    ) -> AppSession:
        count = len(self.list_sessions(user_key=user_key)) + 1
        session = AppSession(
            id=_new_id(id_prefix),
            user_key=user_key,
            user_email=user_email,
            title=(title or f"Session {count}").strip(),
            status="ACTIVE",
            last_opened_at=datetime.utcnow(),
            active_vertex_session_id=(runtime or {}).get("vertex_session_id"),
            active_vertex_app_name=(runtime or {}).get("vertex_app_name"),
            active_vertex_user_id=(runtime or {}).get("vertex_user_id"),
        )
        self.db.add(session)
        self.db.flush()
        return session

    def rename_session(self, *, session: AppSession, title: str) -> AppSession:
        session.title = title.strip()
        session.updated_at = datetime.utcnow()
        self.db.flush()
        return session

    def soft_delete_session(self, *, session: AppSession) -> None:
        session.deleted_at = datetime.utcnow()
        session.status = "DELETED"
        self.db.flush()

    def touch_opened(self, *, session: AppSession) -> AppSession:
        session.last_opened_at = datetime.utcnow()
        session.updated_at = datetime.utcnow()
        self.db.flush()
        return session

    def create_profiling_run(
        self,
        *,
        session: AppSession,
        profiling_context_uri: str | None,
        vertex_session_id: str | None,
        vertex_app_name: str | None,
    ) -> ProfilingRun:
        current = self.get_current_profiling_run(session=session)
        if current and current.status in {
            "RUNNING",
            "READY",
            "COMPLETED",
            "FAILED",
            "IDLE",
        }:
            current.status = "SUPERSEDED"
        run = ProfilingRun(
            id=_new_id("prun"),
            session_id=session.id,
            status="RUNNING",
            current_step="upload",
            profiling_context_uri=profiling_context_uri,
            active_vertex_session_id=vertex_session_id,
            active_vertex_app_name=vertex_app_name,
            resume_state_json={},
        )
        self.db.add(run)
        self.db.flush()
        if current:
            current.superseded_by_run_id = run.id
        session.current_profiling_run_id = run.id
        session.active_vertex_session_id = vertex_session_id
        session.active_vertex_app_name = vertex_app_name
        session.active_vertex_user_id = session.user_key
        self.db.flush()
        return run

    def get_current_profiling_run(self, *, session: AppSession) -> ProfilingRun | None:
        if not session.current_profiling_run_id:
            return None
        return self.db.get(ProfilingRun, session.current_profiling_run_id)

    def update_profiling_run(
        self,
        *,
        run: ProfilingRun,
        status: str | None = None,
        current_step: str | None = None,
        resume_state_json: dict[str, Any] | None = None,
        profiling_context_uri: str | None = None,
        error_message: str | None = None,
        completed: bool = False,
    ) -> ProfilingRun:
        if status:
            run.status = status
        if current_step:
            run.current_step = current_step
        if resume_state_json is not None:
            run.resume_state_json = make_json_compatible(resume_state_json)
        if profiling_context_uri is not None:
            run.profiling_context_uri = profiling_context_uri
        if error_message is not None:
            run.error_message = error_message
        if completed:
            run.completed_at = datetime.utcnow()
        self.db.flush()
        return run

    def create_mapping_run(self, *, session: AppSession) -> MappingRun:
        current = self.get_current_mapping_run(session=session)
        if current and current.status in {
            "RUNNING",
            "READY",
            "REVIEW",
            "COMPLETED",
            "FAILED",
            "IDLE",
        }:
            current.status = "SUPERSEDED"
        run = MappingRun(
            id=_new_id("mrun"),
            session_id=session.id,
            status="RUNNING",
            current_step="ingest",
            resume_state_json={},
        )
        self.db.add(run)
        self.db.flush()
        if current:
            current.superseded_by_run_id = run.id
        session.current_mapping_run_id = run.id
        self.db.flush()
        return run

    def get_current_mapping_run(self, *, session: AppSession) -> MappingRun | None:
        if not session.current_mapping_run_id:
            return None
        return self.db.get(MappingRun, session.current_mapping_run_id)

    def get_mapping_run_by_run_id(
        self, *, session_id: str, mapping_run_id: str
    ) -> MappingRun | None:
        stmt = select(MappingRun).where(
            MappingRun.session_id == session_id,
            MappingRun.mapping_run_id == mapping_run_id,
        )
        return self.db.scalar(stmt)

    def update_mapping_run(
        self,
        *,
        run: MappingRun,
        status: str | None = None,
        current_step: str | None = None,
        resume_state_json: dict[str, Any] | None = None,
        mapping_run_id: str | None = None,
        step1_uri: str | None = None,
        step2_uri: str | None = None,
        step3_review_package_uri: str | None = None,
        step3_capture_uri: str | None = None,
        step4_uri: str | None = None,
        error_message: str | None = None,
        completed: bool = False,
    ) -> MappingRun:
        if status:
            run.status = status
        if current_step:
            run.current_step = current_step
        if resume_state_json is not None:
            run.resume_state_json = make_json_compatible(resume_state_json)
        if mapping_run_id is not None:
            run.mapping_run_id = mapping_run_id
        if step1_uri is not None:
            run.step1_uri = step1_uri
        if step2_uri is not None:
            run.step2_uri = step2_uri
        if step3_review_package_uri is not None:
            run.step3_review_package_uri = step3_review_package_uri
        if step3_capture_uri is not None:
            run.step3_capture_uri = step3_capture_uri
        if step4_uri is not None:
            run.step4_uri = step4_uri
        if error_message is not None:
            run.error_message = error_message
        if completed:
            run.completed_at = datetime.utcnow()
        self.db.flush()
        return run

    # ------------------------------------------------------------------ #
    # Extract runs                                                         #
    # ------------------------------------------------------------------ #
    def create_extract_run(
        self,
        *,
        session: AppSession,
        vertex_session_id: str | None = None,
        vertex_app_name: str | None = None,
    ) -> ExtractRun:
        current = self.get_current_extract_run(session=session)
        if current and current.status in {
            "RUNNING",
            "READY",
            "COMPLETED",
            "FAILED",
            "IDLE",
        }:
            current.status = "SUPERSEDED"
        run = ExtractRun(
            id=_new_id("erun"),
            session_id=session.id,
            status="RUNNING",
            current_step="upload",
            resume_state_json={},
            active_vertex_session_id=vertex_session_id,
            active_vertex_app_name=vertex_app_name,
        )
        self.db.add(run)
        self.db.flush()
        if current:
            current.superseded_by_run_id = run.id
        session.current_extract_run_id = run.id
        self.db.flush()
        return run

    def get_current_extract_run(self, *, session: AppSession) -> ExtractRun | None:
        if not session.current_extract_run_id:
            return None
        return self.db.get(ExtractRun, session.current_extract_run_id)

    def update_extract_run(
        self,
        *,
        run: ExtractRun,
        status: str | None = None,
        current_step: str | None = None,
        resume_state_json: dict[str, Any] | None = None,
        upload_session_id: str | None = None,
        brd_gcs_uri: str | None = None,
        layout_gcs_uri: str | None = None,
        metadata_gcs_uri: str | None = None,
        driver_gcs_uri: str | None = None,
        error_message: str | None = None,
        completed: bool = False,
    ) -> ExtractRun:
        if status:
            run.status = status
        if current_step:
            run.current_step = current_step
        if resume_state_json is not None:
            run.resume_state_json = make_json_compatible(resume_state_json)
        if upload_session_id is not None:
            run.upload_session_id = upload_session_id
        if brd_gcs_uri is not None:
            run.brd_gcs_uri = brd_gcs_uri
        if layout_gcs_uri is not None:
            run.layout_gcs_uri = layout_gcs_uri
        if metadata_gcs_uri is not None:
            run.metadata_gcs_uri = metadata_gcs_uri
        if driver_gcs_uri is not None:
            run.driver_gcs_uri = driver_gcs_uri
        if error_message is not None:
            run.error_message = error_message
        if completed:
            run.completed_at = datetime.utcnow()
        self.db.flush()
        return run

    def save_mapping_review_draft(
        self,
        *,
        mapping_run: MappingRun,
        answers_json: dict[str, Any] | None,
        feedbacks_json: dict[str, Any] | None,
        changed_rows_json: list[Any] | None,
        active_tab: str | None,
        selected_row_id: str | None,
    ) -> MappingReviewDraft:
        draft = mapping_run.review_draft or MappingReviewDraft(
            mapping_run_id=mapping_run.id
        )
        draft.answers_json = make_json_compatible(answers_json)
        draft.feedbacks_json = make_json_compatible(feedbacks_json)
        draft.changed_rows_json = make_json_compatible(changed_rows_json)
        draft.active_tab = active_tab
        draft.selected_row_id = selected_row_id
        if mapping_run.review_draft is None:
            self.db.add(draft)
        self.db.flush()
        return draft

    def get_dashboard_stats(self, *, user_key: str) -> dict[str, Any]:
        user_info_stmt = (
            select(AppSession.user_email)
            .where(AppSession.user_key == user_key)
            .order_by(AppSession.created_at.desc())
            .limit(1)
        )
        email = self.db.scalar(user_info_stmt)
        # Format name: "username@company.com" -> "Username"
        user_name = "User"
        if email:
            user_name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # 1. Total Sessions (Personal)
        # Only count sessions that have at least one profiling run or mapping run
        session_count_stmt = select(func.count(AppSession.id)).where(
            AppSession.user_key == user_key, 
            AppSession.deleted_at.is_(None),
            or_(
                exists().where(ProfilingRun.session_id == AppSession.id),
                exists().where(MappingRun.session_id == AppSession.id)
            )
        )
        total_sessions = self.db.scalar(session_count_stmt) or 0

        # 2. Profiling & Mapping Metrics (Personal)
        # Updated: Join on the specific 'current' run ID stored in the AppSession table
        def fetch_run_metrics(model, current_id_col):
            stmt = (
                select(
                    func.count(model.id)
                    .filter(model.completed_at.is_not(None))
                    .label("completed"),
                    func.count(model.id)
                    .filter(model.completed_at.is_(None))
                    .label("pending"),
                )
                # Join only the run that matches the current_profiling_run_id or current_mapping_run_id
                .join(AppSession, current_id_col == model.id)
                .where(AppSession.user_key == user_key, AppSession.deleted_at.is_(None))
            )
            result = self.db.execute(stmt).one()
            return {"completed": result.completed, "pending": result.pending}

        # Pass the foreign key column to ensure we only count the latest active run per session
        profiling_metrics = fetch_run_metrics(ProfilingRun, AppSession.current_profiling_run_id)
        mapping_metrics = fetch_run_metrics(MappingRun, AppSession.current_mapping_run_id)

        # 3. Recent Activity (Personal)
        recent_activity_stmt = (
            select(AppSession)
            .where(AppSession.user_key == user_key, AppSession.deleted_at.is_(None))
            .order_by(AppSession.updated_at.desc())
            .limit(5)
        )
        recent_sessions = self.db.scalars(recent_activity_stmt).all()
        activity_list = [
            {
                "date": (s.updated_at or s.created_at).isoformat(),
                "session_id": s.id,
                "title": s.title,
                "status": s.status,
            }
            for s in recent_sessions
        ]

        # 4. ALL USERS ACTIVITY (Global - Last 30 Days)
        # Logic for user tables (Sourcing)
        s1 = select(AppSession.user_key, AppSession.user_email, AppSession.created_at.label("dt")).where(AppSession.created_at >= thirty_days_ago, AppSession.id.like("sess_%"))
        s2 = select(AppSession.user_key, AppSession.user_email, ProfilingRun.started_at.label("dt")).join(AppSession, ProfilingRun.session_id == AppSession.id).where(ProfilingRun.started_at >= thirty_days_ago, AppSession.id.like("sess_%"))
        s3 = select(AppSession.user_key, AppSession.user_email, MappingRun.started_at.label("dt")).join(AppSession, MappingRun.session_id == AppSession.id).where(MappingRun.started_at >= thirty_days_ago, AppSession.id.like("sess_%"))

        combined_subquery = union_all(s1, s2, s3).subquery()

        session_counts_sub = (
            select(AppSession.user_key, func.count(AppSession.id).label("total_sessions"))
            .where(
                AppSession.deleted_at.is_(None), 
                AppSession.id.like("sess_%"),
                or_(
                    exists().where(ProfilingRun.session_id == AppSession.id),
                    exists().where(MappingRun.session_id == AppSession.id)
                )
            )
            .group_by(AppSession.user_key).subquery()
        )

        active_users_stmt = (
            select(combined_subquery.c.user_key, combined_subquery.c.user_email, func.max(combined_subquery.c.dt).label("last_active"), session_counts_sub.c.total_sessions)
            .join(session_counts_sub, combined_subquery.c.user_key == session_counts_sub.c.user_key)
            .group_by(combined_subquery.c.user_key, combined_subquery.c.user_email, session_counts_sub.c.total_sessions)
            .order_by(desc("last_active"))
        )
        active_users_results = self.db.execute(active_users_stmt).all()
        all_users_list = [{"user_key": row.user_key, "user_email": row.user_email or "Unknown", "last_activity": row.last_active.isoformat(), "session_count": row.total_sessions} for row in active_users_results]

        # Extract Users Activity logic
        e1 = select(AppSession.user_key, AppSession.user_email, AppSession.created_at.label("dt")).where(AppSession.created_at >= thirty_days_ago, AppSession.id.like("extract_%"))
        e2 = select(AppSession.user_key, AppSession.user_email, ExtractRun.started_at.label("dt")).join(AppSession, ExtractRun.session_id == AppSession.id).where(ExtractRun.started_at >= thirty_days_ago, AppSession.id.like("extract_%"))
        e3 = select(AppSession.user_key, AppSession.user_email, ExtractRun.completed_at.label("dt")).join(AppSession, ExtractRun.session_id == AppSession.id).where(ExtractRun.completed_at >= thirty_days_ago, AppSession.id.like("extract_%"))

        extract_combined_subquery = union_all(e1, e2, e3).subquery()

        extract_session_counts_sub = (
            select(AppSession.user_key, func.count(AppSession.id).label("total_sessions"))
            .where(
                AppSession.deleted_at.is_(None),
                AppSession.id.like("extract_%"),
            )
            .group_by(AppSession.user_key).subquery()
        )

        extract_users_stmt = (
            select(extract_combined_subquery.c.user_key, extract_combined_subquery.c.user_email, func.max(extract_combined_subquery.c.dt).label("last_active"), extract_session_counts_sub.c.total_sessions)
            .join(extract_session_counts_sub, extract_combined_subquery.c.user_key == extract_session_counts_sub.c.user_key)
            .group_by(extract_combined_subquery.c.user_key, extract_combined_subquery.c.user_email, extract_session_counts_sub.c.total_sessions)
            .order_by(desc("last_active"))
        )
        extract_users_results = self.db.execute(extract_users_stmt).all()
        extract_users_list = [{"user_key": row.user_key, "user_email": row.user_email or "Unknown", "last_activity": row.last_active.isoformat(), "session_count": row.total_sessions} for row in extract_users_results]

        return {
            "user_name": user_name,
            "session_count": total_sessions,
            "profiling": profiling_metrics,
            "mapping": mapping_metrics,
            "recent_activity": activity_list,
            "sourcing_users_activity": all_users_list,
            "extract_users_activity": extract_users_list,
        }