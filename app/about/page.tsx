import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Our Story | Deaf Shark Coffee",
  description: "Learn about Deaf Shark Coffee, El Salvador grown beans, and the coffee roasted in Union, New Jersey.",
};

export default function AboutPage() {
  return (
    <main className="content-page">
      <CustomerHeader active="/about" />
      <section className="page-hero about-hero">
        <div>
          <span className="eyebrow">Our coffee and our place</span>
          <h1>Rooted in El Salvador. Roasted in Union.</h1>
          <p>Deaf Shark Coffee brings carefully sourced Salvadoran coffee into a neighborhood shop built for everyday connection.</p>
        </div>
        <img src="/deafshark-dog-art.png" alt="Deaf Shark illustrated character with Salvadoran coffee artwork" />
      </section>
      <section className="origin-media-story">
        <div className="origin-nursery-photo">
          <img src="/el-salvador-nursery.jpg" alt="Coffee plant nursery beneath shade trees in El Salvador" />
        </div>
        <div className="origin-roast-film">
          <video autoPlay muted loop playsInline preload="metadata" poster="/roasting-poster.jpg" aria-label="Coffee beans roasting at Deaf Shark Coffee in Union">
            <source src="/deaf-shark-roasting.mp4" type="video/mp4" />
          </video>
          <div>
            <h2>From green landscape to fresh roast.</h2>
            <p>Direct from the lush coffee trees at the source in El Salvador to our roaster here in Union. This is the real, uncompromised path behind every cup and bag on our shelves.</p>
          </div>
        </div>
      </section>
      <section className="story-grid">
        <article><h2>From the farm</h2><p>The featured roast comes from Finca Montevideo in El Salvador. It is a washed Red Bourbon with a clear connection to where it was grown.</p></article>
        <article><h2>Made locally</h2><p>The beans are roasted in Union, New Jersey, then served alongside breakfast, sandwiches, and familiar Latin favorites.</p></article>
        <article><h2>A local business</h2><p>Deaf Shark is a veteran-owned neighborhood coffee shop with a distinctive character, an original identity, and a growing community around it.</p></article>
      </section>
      <section className="origin-facts">
        <div>
          <span className="eyebrow">Featured coffee</span>
          <h2>A cup with a place behind it.</h2>
        </div>
        <dl>
          <div><dt>Country</dt><dd>El Salvador</dd></div>
          <div><dt>Farm</dt><dd>Finca Montevideo</dd></div>
          <div><dt>Variety</dt><dd>Red Bourbon</dd></div>
          <div><dt>Process</dt><dd>Washed</dd></div>
        </dl>
      </section>
      <SiteFooter />
    </main>
  );
}
