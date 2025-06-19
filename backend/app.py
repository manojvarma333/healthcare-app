import os
from functools import wraps
from datetime import datetime
import razorpay
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, initialize_app, get_app, auth, firestore

# --------------------------------------------------
# Flask application factory
# --------------------------------------------------

def create_app():
    """Create and configure the Flask application."""

    app = Flask(__name__)
    # Allow all origins in production - you may want to restrict this later
    CORS(app, resources={"/api/*": {"origins": "*"}}, supports_credentials=True)

    # --------------------------------------------------
    # Firebase initialisation
    # --------------------------------------------------
    firebase_key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
    if not os.path.exists(firebase_key_path):
        raise RuntimeError(
            "Firebase service account JSON file not found. Set FIREBASE_SERVICE_ACCOUNT env var or place serviceAccountKey.json in the backend directory."
        )
    cred = credentials.Certificate(firebase_key_path)
    try:
        get_app()
    except ValueError:
        initialize_app(cred)

    db = firestore.client()
    appointments_ref = db.collection("appointments")
    # Razorpay client setup
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=True)
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
    razor_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    users_ref = db.collection("users")
    DOCTOR_FEE = 500

    # --------------------------------------------------
    # Helpers
    # --------------------------------------------------

    def verify_firebase_token(func):
        """Decorator that verifies Firebase ID token sent in the Authorization header."""

        @wraps(func)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"msg": "Missing Bearer token"}), 401
            id_token = auth_header.split(" ", 1)[1]
            try:
                decoded_token = auth.verify_id_token(id_token)
                request.user = decoded_token  # type: ignore
            except Exception as exc:  # pylint: disable=broad-except
                return jsonify({"msg": "Invalid or expired token", "error": str(exc)}), 401
            return func(*args, **kwargs)

        return wrapper

    # --------------------------------------------------
    # Routes
    # --------------------------------------------------

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok"})

    @app.route("/api/providers", methods=["GET"])
    def list_providers():
        """Return list of all doctor users {id,name}"""
        docs = users_ref.where("role", "==", "doctor").stream()
        out = []
        for doc in docs:
            d = doc.to_dict()
            out.append({"id": doc.id, "name": d.get("name", d.get("displayName", "Doctor"))})
        return jsonify(out)

    @app.route("/api/payments/order", methods=["POST"])
    @verify_firebase_token
    def create_payment_order():
        data = request.get_json() or {}
        appointment_id = data.get("appointmentId")
        if not appointment_id:
            return jsonify({"msg": "appointmentId required"}), 400
        # fetch appointment
        appt_doc = appointments_ref.document(appointment_id).get()
        if not appt_doc.exists:
            return jsonify({"msg": "Appointment not found"}), 404
        amount_paise = DOCTOR_FEE * 100  # 500 -> 50000 paise
        razor_order = razor_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"appointmentId": appointment_id},
        })
        # update appointment with order info
        appointments_ref.document(appointment_id).update({
            "orderId": razor_order["id"],
            "paymentStatus": "pending",
        })
        return jsonify({"orderId": razor_order["id"], "keyId": RAZORPAY_KEY_ID})

    @app.route("/api/payments/verify", methods=["POST"])
    @verify_firebase_token
    def verify_payment():
        data = request.get_json() or {}
        required = [
            "appointmentId",
            "razorpay_payment_id",
            "razorpay_order_id",
            "razorpay_signature",
        ]
        if any(k not in data for k in required):
            return jsonify({"msg": "Missing fields"}), 400
        try:
            razor_client.utility.verify_payment_signature({
                "razorpay_payment_id": data["razorpay_payment_id"],
                "razorpay_order_id": data["razorpay_order_id"],
                "razorpay_signature": data["razorpay_signature"],
            })
        except razorpay.errors.SignatureVerificationError:
            return jsonify({"msg": "Invalid signature"}), 400
        appointments_ref.document(data["appointmentId"]).update({
            "paymentStatus": "paid",
            "paymentId": data["razorpay_payment_id"],
        })
        return jsonify({"status": "success"})

    @app.route("/api/appointments", methods=["POST"])
    @verify_firebase_token
    def create_appointment():
        data = request.get_json() or {}
        required_fields = ["providerId", "scheduledDate", "duration", "type"]
        missing = [field for field in required_fields if field not in data]
        if missing:
            return jsonify({"msg": f"Missing fields: {', '.join(missing)}"}), 400

        patient_id = request.user["uid"]  # type: ignore
        appointment_doc = appointments_ref.document()
        appointment = {
            "id": appointment_doc.id,
            "patientId": patient_id,
            "providerId": data["providerId"],
            "providerName": data.get("providerName"),
            "scheduledDate": data["scheduledDate"],  # Expect ISO string from front-end
            "duration": data.get("duration", 30),
            "type": data["type"],
            "status": "pending",
            "notes": data.get("notes", ""),
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        appointment_doc.set(appointment)
        # Replace Firestore sentinel objects with ISO timestamps for JSON response
        safe_response = appointment.copy()
        now_iso = datetime.utcnow().isoformat() + "Z"
        safe_response["createdAt"] = now_iso
        safe_response["updatedAt"] = now_iso
        return jsonify(safe_response), 201

    @app.route("/api/appointments", methods=["GET"])
    @verify_firebase_token
    def list_user_appointments():
        user_id = request.user["uid"]  # type: ignore
        docs = appointments_ref.where("patientId", "==", user_id).stream()
        appointments = []
        for doc in docs:
            data = doc.to_dict()
            for key, val in list(data.items()):
                # Convert Firestore Timestamp objects or Python datetimes to ISO strings
                if hasattr(val, "isoformat"):
                    data[key] = val.isoformat() + ("Z" if val.tzinfo is None else "")
            appointments.append(data)
        return jsonify(appointments)

    # --------------------------------------------------
        # Doctor endpoints
        # --------------------------------------------------

    @app.route("/api/provider/appointments", methods=["GET"])
    @verify_firebase_token
    def provider_appointments():
            """Return all appointments for the logged-in doctor"""
            doctor_id = request.user["uid"]  # type: ignore
            docs = appointments_ref.where("providerId", "==", doctor_id).stream()
            out = []
            for doc in docs:
                data = doc.to_dict()
                for k, v in list(data.items()):
                    if hasattr(v, "isoformat"):
                        data[k] = v.isoformat() + ("Z" if v.tzinfo is None else "")
                out.append(data)
            return jsonify(out)

    @app.route("/api/provider/income", methods=["GET"])
    @verify_firebase_token
    def provider_income():
        """Return total income for a given day (defaults to today). Assumes fixed fee of 100 per appointment."""
        doctor_id = request.user["uid"]  # type: ignore
        query_date = request.args.get("date")  # optional
        docs = appointments_ref.where("providerId", "==", doctor_id).stream()
        count = 0
        for doc in docs:
            data = doc.to_dict()
            date_str = data.get("scheduledDate")
            if query_date:
                # filter by provided date (YYYY-MM-DD)
                if date_str and date_str[:10] != query_date:
                    continue
            # either date matches or no date filter
            count += 1
        income = count * DOCTOR_FEE
        return jsonify({"date": query_date or "all", "appointments": count, "income": income})

    return app


# --------------------------------------------------
# Entry-point for `flask run`
# --------------------------------------------------

app = create_app()
