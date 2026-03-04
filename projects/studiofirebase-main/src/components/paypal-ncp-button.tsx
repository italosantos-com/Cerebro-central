"use client";

import React from 'react';

type Props = {
  paymentId?: string;
  label?: string;
  className?: string;
};

export default function PayPalNcpButton({
  paymentId = "QH7F9FWD9SR8G",
  label = "PAY PAL",
  className = "",
}: Props) {
  const action = `https://www.paypal.com/ncp/payment/${paymentId}`;
  const btnClass = `pp-${paymentId}`;

  return (
    <div className={className}>
      <style jsx>{`
        .${btnClass} {
          text-align: center;
          border: none;
          border-radius: 0.25rem;
          min-width: 11.625rem;
          padding: 0 2rem;
          height: 2rem;
          font-weight: bold;
          background-color: #ebebeb;
          color: #000000;
          font-family: "Helvetica Neue", Arial, sans-serif;
          font-size: 0.875rem;
          line-height: 1.125rem;
          cursor: pointer;
        }
      `}</style>
      <form
        action={action}
        method="post"
        target="_blank"
        style={{
          display: "inline-grid",
          justifyItems: "center",
          alignContent: "start",
          gap: "0.5rem",
        }}
      >
        <input className={btnClass} type="submit" value={label} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.paypalobjects.com/images/Debit_Credit.svg"
          alt="cards"
        />
        <section style={{ fontSize: "0.75rem" }}>
          Com tecnologia{" "}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg"
            alt="paypal"
            style={{ height: "0.875rem", verticalAlign: "middle" }}
          />
        </section>
      </form>
    </div>
  );
}
