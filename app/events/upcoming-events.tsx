"use client";

import { useEffect, useState } from "react";

type EventRecord = {
  id: number;
  title: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  entryLabel: string;
  details: string;
  buttonLabel: string;
  buttonHref: string;
  imageLeftUrl: string;
  imageRightUrl: string;
  imageCaption?: string | null;
};

const fallback: EventRecord = {
  id: 0,
  title: "Puppy Party",
  description: "An evening for the neighborhood and their dogs, hosted by Mango the Doxy. Free entry, a menu made for dogs, raffles and prizes through the night. BYOB.",
  dateLabel: "Friday, August 21, 2026",
  timeLabel: "6:00 to 9:00 PM",
  location: "900 Green Lane, Union NJ 07083",
  entryLabel: "Free entry",
  details: "BYOB, puppies, dog menu, raffles, prizes",
  buttonLabel: "RSVP for Puppy Party · FREE",
  buttonHref: "/contact",
  imageLeftUrl: "/events/puppy-mango.jpg",
  imageRightUrl: "/events/puppy-party-flyer.jpg",
  imageCaption: "Mango the Doxy, your host.",
};

export function UpcomingEvents() {
  const [items, setItems] = useState<EventRecord[]>([fallback]);

  useEffect(() => {
    fetch("/api/site-content", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.events?.length && setItems(data.events))
      .catch(() => undefined);
  }, []);

  return (
    <section className="ev-upcoming">
      <div className="ev-upcoming-head"><h2>Events coming soon...</h2></div>
      <div className="ev-upcoming-list">
        {items.map((event) => (
          <article className="ev-upcoming-inner" key={event.id}>
            <div className="ev-upcoming-copy">
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <dl className="ev-details">
                <div><dt>Date</dt><dd>{event.dateLabel}</dd></div>
                <div><dt>Time</dt><dd>{event.timeLabel}</dd></div>
                <div><dt>Location</dt><dd>{event.location}</dd></div>
                <div><dt>Entry</dt><dd>{event.entryLabel}</dd></div>
                <div><dt>Details</dt><dd>{event.details}</dd></div>
              </dl>
              <a className="primary-button" href={event.buttonHref}>{event.buttonLabel}</a>
            </div>
            <div className="ev-upcoming-media">
              <figure className="ev-host-shot">
                <img src={event.imageLeftUrl} alt={`${event.title} photo`} loading="lazy" />
                {event.imageCaption && <figcaption>{event.imageCaption}</figcaption>}
              </figure>
              <figure className="ev-flyer"><img src={event.imageRightUrl} alt={`${event.title} event artwork`} loading="lazy" /></figure>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
