import React, { useState } from 'react';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission - integrate with your preferred service
    console.log('Form submitted:', formData);
    alert('Thank you for your message! I will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="contact">
      <div className="container">
        <h2 className="section-title">Get In Touch</h2>
        <p className="contact-intro">
          Interested in collaborating on research or have questions about my work?
          I'm always happy to discuss immunology, Notch signaling, or potential collaborations.
        </p>

        <div className="contact-info">
          <div className="contact-item">
            <h3>Email</h3>
            <a href="mailto:eric.perkey@uchicagomedicine.org">eric.perkey@uchicagomedicine.org</a><br />
            <a href="mailto:ericperkey@gmail.com">ericperkey@gmail.com</a><br />
            <a href="mailto:eperkey@umich.edu">eperkey@umich.edu</a>
          </div>
          <div className="contact-item">
            <h3>Institution</h3>
            <p>Section of Hematology/Oncology<br />
            University of Chicago<br />
            5841 South Maryland Avenue<br />
            Chicago, IL 60637</p>
          </div>
        </div>

        <div className="contact-divider">
          <span>or send a message</span>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Your message..."
              rows="5"
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary">Send Message</button>
        </form>
      </div>
    </section>
  );
}

export default Contact;
