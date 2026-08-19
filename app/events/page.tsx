import "./events.css";
import type { Metadata } from "next";
import { CustomerHeader, SiteFooter } from "../site-chrome";

export const metadata: Metadata = {
  title: "Events | Deaf Shark Coffee",
  description: "Salsa and networking nights, community gatherings, and upcoming events at Deaf Shark Coffee in Union, New Jersey.",
};

const gallery = [
  { src: "/events/salsa-01.jpg", alt: "Large group photo of the whole crowd gathered under the pavilion at the salsa and networking night" },
  { src: "/events/salsa-02.jpg", alt: "DJ Eazy E at the decks with his open format screen display behind him" },
  { src: "/events/salsa-03.jpg", alt: "Crowd line dancing outdoors at night" },
  { src: "/events/salsa-04.jpg", alt: "Women line dancing together, one leading the group with a microphone" },
  { src: "/events/salsa-05.jpg", alt: "A couple dancing salsa" },
  { src: "/events/salsa-06.jpg", alt: "Guests indoors under the Welcome to Salsa and Networking screen beside a balloon arch" },
  { src: "/events/salsa-07.jpg", alt: "Three guests smiling together indoors at the shop" },
  { src: "/events/salsa-08.jpg", alt: "Two hosts speaking with microphones by the counter" },
  { src: "/events/salsa-09.jpg", alt: "Group of six guests posing together outside at night" },
  { src: "/events/salsa-10.jpg", alt: "Host leading a line dance indoors with a microphone" },
];

export default function EventsPage() {
  return (
    <main className="content-page">
      <CustomerHeader active="/events" />

      <section className="ev-hero">
        <div className="ev-hero-copy">
          <span className="ev-eyebrow">More than a coffee shop</span>
          <h1>A gathering place in Union.</h1>
          <p>The counter serves coffee all day, and some nights the room turns into something else. Music, dancing, and neighbors meeting neighbors, right here at 900 Green Lane.</p>
        </div>
        <div className="ev-hero-media">
          <img src="/events/salsa-01.jpg" alt="The whole crowd gathered under the pavilion at the salsa and networking night" />
        </div>
      </section>

      <section className="ev-featured">
        <div className="ev-featured-copy">
          <span className="ev-eyebrow">Featured event</span>
          <h2>Salsa and Networking</h2>
          <p>An evening hosted with the Township of Union. Live open format DJ set by DJ Eazy E, salsa dancing that spilled from the counter out to the pavilion, and local business owners meeting each other over coffee.</p>
          <dl className="ev-details">
            <div>
              <dt>Date</dt>
              <dd>Thursday, August 13, 2026</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>900 Green Lane, Union NJ 07083</dd>
            </div>
            <div>
              <dt>Partner</dt>
              <dd>Township of Union</dd>
            </div>
            <div>
              <dt>Music</dt>
              <dd>DJ Eazy E</dd>
            </div>
          </dl>
          <a className="primary-button" href="/contact">Visit the shop</a>
        </div>
        <div className="ev-featured-media">
          <figure className="ev-featured-shot ev-featured-shot-tall">
            <img src="/events/salsa-05.jpg" alt="A couple dancing salsa" loading="lazy" />
          </figure>
          <figure className="ev-featured-shot">
            <img src="/events/salsa-02.jpg" alt="DJ Eazy E at the decks with his open format screen display behind him" loading="lazy" />
          </figure>
          <figure className="ev-featured-shot">
            <img src="/events/salsa-06.jpg" alt="Guests indoors under the Welcome to Salsa and Networking screen beside a balloon arch" loading="lazy" />
          </figure>
        </div>
      </section>

      <section className="ev-mayor">
        <div className="ev-mayor-inner">
          <div className="ev-mayor-copy">
            <span className="ev-eyebrow">From the township</span>
            <h2>The Mayor of Union joined the community at the shop.</h2>
            <p>The Mayor of Union stopped in during the evening and spoke with the neighbors, business owners, and families who filled the room. Press play to watch the moment.</p>
            <p className="ev-note">Mayor Patricia Guerra-Frazier, Township of Union.</p>
          </div>
          <div className="ev-films">
            <figure className="ev-mayor-film">
              {/* No caption track exists for this clip yet. Add a VTT file and a track element once one is produced. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video controls playsInline preload="metadata" aria-label="Video of the Mayor of Union speaking at Deaf Shark Coffee">
                <source src="/events/mayor-visit.mp4" type="video/mp4" />
              </video>
              <figcaption>The Mayor of Union at Deaf Shark Coffee, 900 Green Lane. Video has sound.</figcaption>
            </figure>
            <figure className="ev-mayor-film">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video controls playsInline preload="metadata" aria-label="Video from the Salsa and Networking night at Deaf Shark Coffee">
                <source src="/events/salsa-night.mp4" type="video/mp4" />
              </video>
              <figcaption>Salsa and Networking night on the pavilion. Video has sound.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="ev-upcoming">
        <div className="ev-upcoming-copy">
          <span className="ev-eyebrow">Coming up</span>
          <h2>Puppy Party</h2>
          <p>An evening for the neighborhood and their dogs, hosted by Mango the Doxy. Free entry, a menu made for dogs, raffles and prizes through the night. BYOB.</p>
          <dl className="ev-details">
            <div>
              <dt>Date</dt>
              <dd>Friday, August 21, 2026, 6:00 to 9:00 PM</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>900 Green Lane, Union NJ 07083</dd>
            </div>
            <div>
              <dt>Entry</dt>
              <dd>Free entry</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd>Mango the Doxy</dd>
            </div>
            <div>
              <dt>Details</dt>
              <dd>BYOB, puppies, dog menu, raffles, prizes</dd>
            </div>
          </dl>
          <a className="primary-button" href="tel:+19084818884">Call for details</a>
        </div>
        <div className="ev-upcoming-media">
          <figure className="ev-host-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/events/puppy-mango.jpg" alt="Mango the Doxy, a long haired dapple dachshund, held in someone&apos;s arms at the shop." loading="lazy" width={3024} height={3780} />
            <figcaption>Mango the Doxy, your host.</figcaption>
          </figure>
          <figure className="ev-flyer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/events/puppy-party-flyer.jpg" alt="Puppy Party flyer. Live at Deaf Shark Coffee, hosted by Mango the Doxy. August 21 2026, 900 Green Lane Union NJ 07083, free entry, 6 PM to 9 PM." loading="lazy" width={1080} height={1350} />
          </figure>
        </div>
      </section>

      <section className="ev-gallery">
        <div className="ev-gallery-head">
          <span className="ev-eyebrow">The room that night</span>
          <h2>Salsa and Networking, in photos.</h2>
        </div>
        <div className="ev-gallery-grid">
          {gallery.map((shot) => (
            <figure key={shot.src} className="ev-shot">
              <img src={shot.src} alt={shot.alt} loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <section className="ev-cta">
        <div>
          <span className="ev-eyebrow">Next one</span>
          <h2>Host an evening with us, or hear about the next one.</h2>
          <p>Community groups, local businesses, and neighbors are welcome. Call the shop or stop by the counter and tell us what you have in mind.</p>
        </div>
        <div className="ev-cta-actions">
          <a className="primary-button" href="/contact">Visit Us</a>
          <a className="ev-cta-call" href="tel:+19084818884">(908) 481-8884</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
