import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Mail, MapPin, Shield, Clock, Users, FileText, Eye, Edit3, Trash2, Lock } from 'lucide-react';
import '../styles/PrivacyPolicyPage.css';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="privacy-container">
      {/* Breadcrumb Navigation */}
      <div className="privacy-breadcrumb">
        <Link to="/colloqui" className="breadcrumb-link">
          <Home size={16} />
          Torna alla Home
        </Link>
      </div>

      {/* Header */}
      <div className="privacy-header">
        <div className="privacy-header-content">
          <Shield size={48} className="privacy-icon" />
          <h1>Privacy Policy</h1>
          <p>Informativa sul trattamento dei dati personali</p>
          <div className="effective-date">
            <strong>Ultimo aggiornamento:</strong> 8 Luglio 2025
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="privacy-content">
        <div className="privacy-document">
          <section className="privacy-section">
            <div className="section-header">
              <Users className="section-icon" size={24} />
              <h2>Chi siamo</h2>
            </div>
            <p>
              Riforma e Progresso è un'associazione che si occupa di ricerca e divulgazione in ambito politico ed economico. 
              Questo sito web gestisce un sistema di prenotazione colloqui per candidati interessati a collaborare con noi.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <FileText className="section-icon" size={24} />
              <h2>Dati Raccolti</h2>
            </div>
            <p>Quando prenoti un colloquio attraverso il nostro sito, raccogliamo:</p>
            <ul className="data-list">
              <li>
                <strong>Dati personali:</strong> nome, cognome, email, numero di telefono
              </li>
              <li>
                <strong>Dati professionali:</strong> ruolo/posizione di interesse, curriculum vitae
              </li>
              <li>
                <strong>Dati dell'appuntamento:</strong> data e ora selezionate, eventuali note aggiuntive
              </li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Eye className="section-icon" size={24} />
              <h2>Come vengono utilizzati i dati raccolti</h2>
            </div>
            <p>Utilizziamo i tuoi dati esclusivamente per:</p>
            <ul className="purpose-list">
              <li>Gestire la tua prenotazione e confermare l'appuntamento</li>
              <li>Contattarti per comunicazioni relative al colloquio</li>
              <li>Valutare la tua candidatura in base al curriculum fornito</li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Clock className="section-icon" size={24} />
              <h2>Archiviazione e conservazione dei dati</h2>
            </div>
            <div className="retention-notice">
              <p>
                I tuoi dati personali vengono conservati per massimo 2 anni dalla data di creazione dell'appuntamento, 
                dopodiché vengono completamente eliminati dai nostri sistemi.
              </p>
            </div>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Users className="section-icon" size={24} />
              <h2>Con chi condividiamo i dati</h2>
            </div>
            <p>Non condividiamo, vendiamo o trasferiamo i tuoi dati personali a terze parti, eccetto:</p>
            <ul className="sharing-list">
                <li>Con Amazon Web Services per l'hosting e l'infrastruttura del sito, che agisce come responsabile del trattamento dei dati secondo gli standard GDPR</li>
                <li>Quando richiesto dalla legge</li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Shield className="section-icon" size={24} />
              <h2>I tuoi diritti</h2>
            </div>
            <p>Hai il diritto di:</p>
            <div className="rights-grid">
              <div className="right-item">
                <Eye size={20} className="right-icon" />
                <div className="right-content">
                  <h4>Accedere</h4>
                  <p>ai dati che abbiamo su di te</p>
                </div>
              </div>
              <div className="right-item">
                <Trash2 size={20} className="right-icon" />
                <div className="right-content">
                  <h4>Cancellare</h4>
                  <p>i tuoi dati personali</p>
                </div>
              </div>
            </div>
            <div className="contact-rights">
              <p>
                Per esercitare questi diritti, contattaci: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link>
              </p>
            </div>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Lock className="section-icon" size={24} />
              <h2>Sicurezza dei dati</h2>
            </div>
            <p>
              Implementiamo misure di sicurezza appropriate per proteggere i tuoi dati personali da accesso non autorizzato, 
              alterazione, o divulgazione.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <FileText className="section-icon" size={24} />
              <h2>Cookie</h2>
            </div>
            <p>
              Il nostro sito utilizza cookie tecnici essenziali per il corretto funzionamento del sistema di prenotazione. 
              Non utilizziamo cookie di profilazione o di marketing.
            </p>
          </section>

          {/* Section: Modifiche */}
          <section className="privacy-section">
            <div className="section-header">
              <Edit3 className="section-icon" size={24} />
              <h2>Modifiche a questa privacy policy</h2>
            </div>
            <p>
              Potremmo aggiornare questa privacy policy periodicamente. Ti informeremo di eventuali modifiche 
              importanti tramite avviso sul sito.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Mail className="section-icon" size={24} />
              <h2>Contatti</h2>
            </div>
            <p>Contattaci per qualsiasi domanda riguardo questa privacy policy o al trattamento dei tuoi dati: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;