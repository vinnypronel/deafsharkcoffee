import "./employment.css";
import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";
import EmploymentForm from "./employment-form";

export const metadata: Metadata = {
  title: "Employment | Deaf Shark Coffee",
  description: "Apply to work at Deaf Shark Coffee, a veteran-owned neighborhood coffee shop in Union, New Jersey.",
};

export default function EmploymentPage() {
  return (
    <main className="content-page">
      <CustomerHeader active="/employment" />
      <section className="page-hero emp-hero">
        <div>
          <span className="emp-eyebrow">Work with us</span>
          <h1>Join the counter in Union.</h1>
          <p>Deaf Shark Coffee is a veteran-owned neighborhood shop. Our coffee comes from El Salvador and is roasted right here in Union, then served across the counter to the people who live and work nearby. If that is the kind of place you want to spend your shifts, tell us about yourself.</p>
        </div>
        <div className="emp-hero-mark">
          <img src="/deafshark-logo.png" alt="Deaf Shark Coffee logo" />
        </div>
      </section>

      <section className="emp-values" aria-labelledby="emp-values-heading">
        <h2 id="emp-values-heading" className="emp-values-heading">What we look for</h2>
        <div className="emp-values-grid">
          <article>
            <span>01</span>
            <h3>Reliability</h3>
            <p>Shifts start early and the counter depends on the people scheduled for it. Showing up on time, ready to work, matters more here than any resume line.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Care for the customer</h3>
            <p>Most of the people who walk in are neighbors and regulars. We want the kind of staff who notice a face, remember an order, and make the visit worth repeating.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Willingness to learn</h3>
            <p>Experience is welcome but it is not required. If you are curious about coffee, the espresso bar, and the kitchen, we can teach the rest on the floor.</p>
          </article>
        </div>
      </section>

      <EmploymentForm />
      <SiteFooter />
    </main>
  );
}
