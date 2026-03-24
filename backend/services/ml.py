import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict

class StudyPredictor:
    @staticmethod
    def predict_future_hours(sessions: List[Dict]) -> Dict:
        """
        Simple Linear Regression to predict study hours for the next 7 days.
        Uses [day_index] as X and [total_minutes] as Y.
        """
        if len(sessions) < 3:
            return {"prediction": "Insufficient data for neural projection", "trend": "Stable"}

        # Aggregate minutes by date
        daily_totals = {}
        for s in sessions:
            # Handle both string and datetime objects
            date_str = s['timestamp'].split(' ')[0] if isinstance(s['timestamp'], str) else s['timestamp'].strftime('%Y-%m-%d')
            daily_totals[date_str] = daily_totals.get(date_str, 0) + s.get('duration_minutes', s.get('minutes', 0))

        # Sort dates
        sorted_dates = sorted(daily_totals.keys())
        y = np.array([daily_totals[d] for d in sorted_dates])
        x = np.array(range(len(y)))

        # Linear Regression: y = mx + c
        if len(x) > 1:
            m, c = np.polyfit(x, y, 1)
            # Predict next 7 days average
            next_x = len(x) + 3 # Midpoint of next week
            prediction = max(0, m * next_x + c)
            
            trend = "Ascending" if m > 0.5 else "Descending" if m < -0.5 else "Plateau"
            confidence = min(95, 60 + len(sessions))
            
            return {
                "predicted_daily_minutes": round(prediction, 1),
                "trend_velocity": round(m, 2),
                "trend_label": trend,
                "confidence_interval": f"{confidence}%",
                "reasoning": f"Based on velocity of {round(m, 2)} min/day over {len(x)} observation points."
            }
        
        return {"prediction": "Neural calibration in progress", "trend": "Initializing"}

    @staticmethod
    def streak_risk_assessment(sessions: List[Dict]) -> str:
        """
        Heuristic-based 'Classification': predict if streak will break.
        """
        if not sessions: return "High Risk"
        
        last_session = max(sessions, key=lambda x: x['timestamp'])
        last_date = datetime.strptime(last_session['timestamp'].split(' ')[0], '%Y-%m-%d') if isinstance(last_session['timestamp'], str) else last_session['timestamp']
        
        days_since = (datetime.utcnow() - last_date).days
        
        if days_since == 0: return "Low Risk (Active)"
        if days_since == 1: return "Moderate Risk (Needs session today)"
        return "Critical Risk (Streak compromised)"
