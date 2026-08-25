import React, { useState } from 'react';

const faqs = [
  {
    q: 'Has this research been peer reviewed?',
    a: `It's been submitted to the Journal of Making America Healthy Again — currently
      under review. But let's be honest: "peer review" is just a fancy way of saying
      "other scientists get to decide if your science is allowed." The same peer review
      system rejected the guy who discovered stomach ulcers are caused by bacteria.
      He won the Nobel Prize. Real breakthroughs don't come from committees.`
  },
  {
    q: 'What is the regulatory pathway?',
    a: `Once we prove this works in the lab, we'll file with the FDA to start human trials.
      With the current administration's commitment to therapeutic freedom and getting
      the bureaucracy out of the way, we're confident this will move faster than it
      ever could have under the old regime. Both ivermectin and methylene blue already
      have decades of safety data — they're not new drugs, they're SUPPRESSED drugs.`
  },
  {
    q: 'Can I start taking ivermectin and methylene blue now?',
    a: `We can't give medical advice — talk to your doctor. But we will say this: both
      of these compounds are available right now for their approved uses. Millions of
      people around the world take ivermectin safely every day. Do your own research.
      Make your own decisions. That's what health freedom is all about.`
  },
  {
    q: 'Why did the NIH reject you?',
    a: `Because the NIH is a captured agency. For decades under Fauci, they only funded
      research that kept Big Pharma's pipeline full. Our application proposed using two
      dirt-cheap generic drugs to fight cancer. You think that's going to get funded by
      the same people who fast-tracked billion-dollar drugs? They didn't even read the
      full application. Threw it out. That tells you everything you need to know.`
  },
  {
    q: 'What\'s the connection between parasites and cancer?',
    a: `Simple: the parasite Strongyloides lives in your gut and constantly pokes at your
      immune cells. After years of that irritation, those cells can go haywire and become
      cancerous. It's like how a constant sunburn can cause skin cancer — chronic irritation
      leads to bad things. Nobody has studied this connection because there's no money in it.
      Parasite drugs are cheap. Cancer drugs are not. Follow the money.`
  },
  {
    q: 'How does this align with President Trump\'s health agenda?',
    a: `This IS the MAHA agenda in action. President Trump and Secretary Kennedy have been
      crystal clear: the American people deserve access to affordable treatments, free
      from Big Pharma's stranglehold. Ivermectin and methylene blue are off-patent — anyone
      can make them, anyone can afford them. That's exactly the kind of medicine this
      administration is fighting to make available. We're proud to be part of that mission.`
  },
  {
    q: 'Are the higher ivermectin doses safe?',
    a: `The normal dose has been used safely for DECADES — hundreds of millions of doses
      given worldwide. We're testing up to 10x that amount in the lab. The mainstream
      scientists say "you can't get enough in the blood to kill cancer." We say: watch us.
      New delivery methods are being developed every day. The dose is an engineering problem,
      not a reason to give up. That's what separates real scientists from bureaucrats.`
  },
  {
    q: 'What if the campaign doesn\'t reach its goal?',
    a: `All-or-nothing. If we don't hit $2.2 million by March 15, 2029, you get every
      penny back. No questions asked. But we WILL hit it — because the American people
      are tired of being told which science is "allowed." Share this campaign. Tell your
      friends. This is bigger than one study — it's a movement.`
  },
  {
    q: 'How else can I help?',
    a: `SHARE. SHARE. SHARE. Post it on Truth Social, X, Gab, Facebook — everywhere.
      Send it to your pastor, your local representatives, your friends who've been
      affected by cancer. If you have expertise in biology, filmmaking, or just a
      really loud megaphone, we want to hear from you. Contact us below.`
  }
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="section section-dark" id="faq">
      <h2 className="section-title">Frequently Asked Questions</h2>
      <div className="faq-list">
        {faqs.map((faq, i) => (
          <div className={`faq-item ${openIndex === i ? 'open' : ''}`} key={i}>
            <button
              className="faq-question"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span>{faq.q}</span>
              <span className="faq-toggle">{openIndex === i ? '−' : '+'}</span>
            </button>
            {openIndex === i && (
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default FAQ;
