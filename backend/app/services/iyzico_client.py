"""
Custom Iyzico HTTP client – replaces the buggy iyzipay SDK.

The official iyzipay-python v1.0.46 SDK has an issue where
CheckoutFormInitialize and all payment endpoints return error 1001
even when credentials are valid (ApiTest succeeds).  This module
reimplements the necessary calls using raw HTTP with the exact same
IYZWSv2 signing scheme the SDK uses.

Usage
-----
    from app.services.iyzico_client import IyzicoClient, IyzicoError

    client = IyzicoClient(api_key, secret_key, base_url)

    # Quick connectivity check (returns True/False)
    ok = client.api_test()

    # Start a checkout form session
    result = client.checkout_form_initialize(request_body)
    # result["token"], result["checkoutFormContent"]

    # Retrieve payment result after callback
    result = client.checkout_form_retrieve(token)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import http.client
import json
import random
import string
from typing import Any


class IyzicoError(Exception):
    """Raised when Iyzico returns a non-success response."""

    def __init__(self, error_code: str, error_message: str, raw: dict):
        self.error_code = error_code
        self.error_message = error_message
        self.raw = raw
        super().__init__(f"Iyzico [{error_code}]: {error_message}")


class IyzicoClient:
    """Lightweight Iyzico REST client with IYZWSv2 auth."""

    _RND_SIZE = 8

    def __init__(self, api_key: str, secret_key: str, base_url: str = "sandbox-api.iyzipay.com"):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url

    # ── Auth helpers ──────────────────────────────────────────────

    def _random_string(self) -> str:
        return "".join(
            random.SystemRandom().choice(string.ascii_letters + string.digits)
            for _ in range(self._RND_SIZE)
        )

    def _generate_v2_auth(self, url: str, random_str: str, body_str: str) -> str:
        """
        Exact replication of the SDK's ``generate_v2_hash``:

            msg  = (randomStr + url + bodyStr)
            sig  = HMAC-SHA256(secretKey, msg).hexdigest()
            hdr  = base64("apiKey:<key>&randomKey:<rnd>&signature:<sig>")
        """
        sk_bytes = self.secret_key.encode("utf-8")
        msg = (random_str + url + body_str).encode("utf-8")

        hmac_obj = hmac.new(sk_bytes, digestmod=hashlib.sha256)
        hmac_obj.update(msg)
        signature = hmac_obj.hexdigest()

        parts = "&".join([
            f"apiKey:{self.api_key}",
            f"randomKey:{random_str}",
            f"signature:{signature}",
        ])
        encoded = base64.b64encode(parts.encode()).decode()
        return f"IYZWSv2 {encoded}"

    # ── Low-level request ─────────────────────────────────────────

    def _request(self, method: str, uri: str, body: dict | None = None) -> dict:
        body_str = json.dumps(body, separators=(',', ':')) if body else ""
        random_str = self._random_string()
        authorization = self._generate_v2_auth(uri, random_str, body_str)

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": authorization,
            "x-iyzi-rnd": random_str,
            "x-iyzi-client-version": "kurohi-custom-1.0",
        }

        conn = http.client.HTTPSConnection(self.base_url, timeout=30)
        try:
            conn.request(method, uri, body_str if body else None, headers)
            resp = conn.getresponse()
            data: dict = json.loads(resp.read().decode("utf-8"))
        finally:
            conn.close()

        if data.get("status") != "success":
            raise IyzicoError(
                error_code=data.get("errorCode", "UNKNOWN"),
                error_message=data.get("errorMessage", "Bilinmeyen hata"),
                raw=data,
            )
        return data

    # ── Public API ────────────────────────────────────────────────

    def api_test(self) -> bool:
        """Returns True if credentials are valid and Iyzico is reachable."""
        try:
            result = self._request("GET", "/payment/test")
            return result.get("status") == "success"
        except Exception:
            return False

    def checkout_form_initialize(self, request_body: dict) -> dict:
        """
        POST /payment/iyzipos/checkoutform/initialize/auth/ecom

        Returns dict with ``token`` and ``checkoutFormContent`` on success.
        Raises ``IyzicoError`` on failure.
        """
        return self._request(
            "POST",
            "/payment/iyzipos/checkoutform/initialize/auth/ecom",
            request_body,
        )

    def checkout_form_retrieve(self, token: str) -> dict:
        """
        POST /payment/iyzipos/checkoutform/auth/ecom/detail

        Retrieves the payment result for a completed checkout form session.
        """
        return self._request(
            "POST",
            "/payment/iyzipos/checkoutform/auth/ecom/detail",
            {"locale": "tr", "token": token},
        )
