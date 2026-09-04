import "./employment.css";
import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";
import EmploymentForm, { ApplyButton } from "./employment-form";

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
          <h1>Join the counter in Union.</h1>
          <p>Deaf Shark Coffee is a veteran-owned neighborhood shop. Our coffee comes from El Salvador and is roasted right here in Union, then served across the counter to the people who live and work nearby. If that is the kind of place you want to spend your shifts, tell us about yourself.</p>
        </div>
        <div className="emp-hero-mark">
          <img src="/deafshark-logo-640.webp" alt="Deaf Shark Coffee logo" decoding="async" />
        </div>
      </section>

      {/* Featured We're Hiring Announcement Card */}
      <section className="emp-flyer-section" aria-label="We're Hiring Announcement">
        <div className="emp-flyer-card">
          <div className="emp-flyer-media">
            <img
              src="/hiring-flyer.png"
              alt="Deaf Shark Coffee - We're Hiring! Experienced Barista Wanted"
              className="emp-flyer-img"
            />
          </div>
          <div className="emp-flyer-copy">
            <h2>Now Hiring: Experienced Barista Wanted</h2>
            <p className="emp-flyer-lead">
              Deaf Shark Coffee is seeking an experienced barista who wants to be part of creating a unique coffee experience from helping curate the menu to shaping the customer experience and growing the brand with us.
            </p>
            <div className="emp-flyer-looking-for">
              <h3>Come join the family. We are looking for someone who:</h3>
              <ul className="emp-flyer-list">
                <li>Has real barista experience</li>
                <li>Can work the kitchen for breakfast, sandwiches, and bites</li>
                <li>Is comfortable on the register taking orders and handling payments</li>
                <li>Understands quality, workflow, and presentation</li>
                <li>Wants creative input on drinks & menu development</li>
                <li>Brings positive energy and leadership</li>
                <li>Wants to grow with a serious new brand</li>
              </ul>
            </div>
            <div className="emp-flyer-actions">
              <ApplyButton />
            </div>
          </div>
        </div>
      </section>

      <section className="emp-values" aria-labelledby="emp-values-heading">
        <h2 id="emp-values-heading" className="emp-values-heading">What we look for</h2>
        <div className="emp-values-grid">
          <article>
            <h3>Reliability</h3>
            <p>Shifts start early and the counter depends on the people scheduled for it. Showing up on time, ready to work, matters more here than any resume line.</p>
          </article>
          <article>
            <h3>Care for the customer</h3>
            <p>Most of the people who walk in are neighbors and regulars. We want the kind of staff who notice a face, remember an order, and make the visit worth repeating.</p>
          </article>
          <article>
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
