import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Mail, ShieldCheck, Shield, Clock, Users, FileText, Eye, Edit3, Lock } from 'lucide-react';
import '../styles/pages/PrivacyPolicyPage.css';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="privacy-container">
      {/* Breadcrumb Navigation */}
      <div className="privacy-breadcrumb">
        <Link to="/" className="breadcrumb-link">
          <Home size={16} />
          Torna alla Home
        </Link>
      </div>

      {/* Header */}
      <div className="privacy-header">
        <div className="privacy-header-content">
          <ShieldCheck size={48} className="privacy-icon" />
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
              <h2>Chi Siamo</h2>
            </div>
            <p>
              Riforma e Progresso è una ATS che si occupa di ricerca e divulgazione in ambito politico ed economico. 
              Questo sito web gestisce un sistema di prenotazione colloqui per candidati interessati a collaborare con noi.
            </p>
            <div className="contact-details">
              <p><strong>Titolare del trattamento:</strong> Riforma e Progresso</p>
              <p><strong>Sede legale:</strong> Via Lungo Crostolo 1, 42121 Reggio Emilia (RE)</p>
              <p><strong>Rappresentante legale:</strong> Michele Bagnato</p>
              <p><strong>Email:</strong> <Link to="/contattaci" className="privacy-link">sezione.colloqui@riformaeprogresso.it</Link></p>
            </div>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Shield className="section-icon" size={24} />
              <h2>Base giuridica del trattamento</h2>
            </div>
            <p>Il trattamento dei vostri dati personali si basa sulle seguenti basi giuridiche previste dall'articolo 6 del Regolamento UE 2016/679:</p>
            <ul className="privacy-list">
              <li>
                <strong>Consenso dell'interessato (art. 6, par. 1, lett. a)</strong> per il trattamento dei dati personali finalizzato alla valutazione dell'assegnazione di ruoli e attività.
              </li>
              <li>
                <strong>Legittimo interesse (art. 6, par. 1, lett. f)</strong> per finalità statistiche e di miglioramento dei nostri servizi, purché non prevalgano i vostri diritti e libertà fondamentali.
              </li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <FileText className="section-icon" size={24} />
              <h2>Dati Raccolti</h2>
            </div>
            <p>Quando prenotate un colloquio attraverso il nostro sito, raccogliamo:</p>
            <ul className="privacy-list">
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
            <ul className="privacy-list">
              <li>Valutare l'assegnazione di ruoli e attività in Riforma e Progresso</li>
              <li>Fini statistici e non nominativi per il miglioramento dei nostri servizi</li>
              <li>Adempiere agli obblighi di legge quando richiesto</li>
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
                dopodiché vengono completamente eliminati dai nostri sistemi, in conformità al principio di limitazione della conservazione previsto dal GDPR.
              </p>
              <p>
                Conserviamo dati statistici anonimi indefinitamente per migliorare i nostri servizi, ma questi non sono riconducibili a persone specifiche.
              </p>
            </div>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Users className="section-icon" size={24} />
              <h2>Con chi condividiamo i dati</h2>
            </div>
            <p>Non condividiamo, vendiamo o trasferiamo i tuoi dati personali a terze parti, eccetto:</p>
            <ul className="privacy-list">
              <li>
                Con Google (Gmail, Google Drive, Google Docs) per comunicazioni, archiviazione dati e documenti, con Amazon Web Services per hosting, database e infrastruttura del sito, i quali agiscono come responsabili del trattamento secondo gli standard GDPR, con garanzie adeguate per i trasferimenti verso paesi terzi.
              </li>
              <li>Quando richiesto dalla legge o dalle autorità competenti</li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Shield className="section-icon" size={24} />
              <h2>I tuoi diritti</h2>
            </div>
            <p>Hai il diritto di:</p>            
            <div className="rights">
              <ul className="privacy-list">
                <li>
                  <strong>Accedere</strong> ai dati che abbiamo su di te, richiedendo conferma dell'esistenza del trattamento e ottenendo informazioni sulle modalità e finalità
                </li>
                <li>
                  <strong>Rettificare</strong> i tuoi dati personali se sono inesatti o incompleti
                </li>
                <li>
                  <strong>Cancellare</strong> i tuoi dati personali quando non sono più necessari per le finalità per cui sono stati raccolti
                </li>
                <li>
                  <strong>Limitare</strong> il trattamento dei tuoi dati in specifiche circostanze previste dalla legge
                </li>
                <li>
                  <strong>Portabilità</strong>, ricevendo i tuoi dati in formato strutturato e leggibile
                </li>
                <li>
                  <strong>Opporti</strong> al trattamento dei tuoi dati per motivi legittimi
                </li>
                <li>
                  <strong>Revocare il consenso</strong> in qualsiasi momento, senza pregiudicare la liceità del trattamento basata sul consenso prestato prima della revoca
                </li>
                <li>
                  <strong>Proporre reclamo</strong> all'Autorità Garante per la protezione dei dati personali
                </li>
              </ul>
            </div>

            <div className="exercise-rights">
              <h4>Come esercitare i tuoi diritti</h4>
              <p>
                Per esercitare i diritti di cui sopra, contatta: <Link to="/contattaci" className="privacy-link">sezione.colloqui@riformaeprogresso.it</Link>
              </p>
              <p>
                Ti risponderemo entro un mese dalla ricezione della richiesta, come previsto dall'articolo 12 del GDPR. 
                In caso di richieste complesse, il termine può essere prorogato di ulteriori due mesi, di cui ti informeremo tempestivamente.
              </p>
            </div>

            <div className="complaint-right">
              <h4>Diritto di reclamo</h4>
              <p>
                Hai il diritto di proporre reclamo all'Autorità Garante per la protezione dei dati personali se ritieni che il trattamento dei tuoi dati personali violi la normativa vigente.
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
              alterazione, divulgazione o distruzione. Queste misure includono:
            </p>
            <ul className="privacy-list">
              <li>Crittografia dei dati in transito e a riposo</li>
              <li>Controlli di accesso rigorosi ai sistemi che contengono dati personali</li>
              <li>Formazione del personale sui principi di protezione dei dati</li>
              <li>Monitoraggio continuo dei sistemi per rilevare eventuali violazioni</li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Shield className="section-icon" size={24} />
              <h2>Trasferimenti verso paesi terzi</h2>
            </div>
            <p>
              I trasferimenti di dati personali verso Google ed AWS (Amazon Web Services) avvengono sulla base di garanzie adeguate, in particolare:
            </p>
            <ul className="privacy-list">
              <li>
                Clausole Contrattuali Standard approvate dalla Commissione Europea ai sensi dell'articolo 49 del GDPR
              </li>
              <li>
                Misure tecniche e organizzative supplementari per garantire un livello di protezione sostanzialmente equivalente a quello dell'Unione Europea
              </li>
            </ul>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <FileText className="section-icon" size={24} />
              <h2>Processo decisionale automatizzato</h2>
            </div>
            <p>
              Il nostro sistema di prenotazione non utilizza processi decisionali automatizzati o profilazione che producano effetti giuridici significativi sui tuoi diritti. 
              Tutte le valutazioni relative ai colloqui e alle collaborazioni sono effettuate da persone fisiche.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <FileText className="section-icon" size={24} />
              <h2>Cookie</h2>
            </div>
            <p>
              Il nostro sito utilizza cookie tecnici essenziali per il corretto funzionamento del sistema di prenotazione. 
              Questi cookie sono necessari per:
            </p>
            <ul className="privacy-list">
              <li>Mantenere la sessione durante la prenotazione</li>
              <li>Garantire la sicurezza del sistema</li>
              <li>Ricordare le preferenze di navigazione essenziali</li>
            </ul>
            <p>
              Non utilizziamo cookie di profilazione o di marketing. I cookie tecnici hanno una durata limitata alla sessione di navigazione 
              o al tempo strettamente necessario per fornire il servizio richiesto.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Shield className="section-icon" size={24} />
              <h2>Responsabile della Protezione dei Dati (DPO)</h2>
            </div>
            <p>
              Data la natura e le dimensioni della nostra associazione, non abbiamo nominato un Responsabile della Protezione dei Dati, 
              in quanto non ricorriamo nelle fattispecie previste dall'articolo 37 del GDPR che rendono obbligatoria tale nomina.
            </p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Edit3 className="section-icon" size={24} />
              <h2>Modifiche a questa privacy policy</h2>
            </div>
            <p>Potremmo aggiornare questa privacy policy periodicamente per riflettere cambiamenti nelle nostre pratiche o nella normativa applicabile.</p>
            <p>Ti informeremo di eventuali modifiche pubblicando la nuova informativa sulla privacy su questa pagina e aggiornando la data di "Ultimo aggiornamento". Le modifiche sostanziali saranno comunicate con maggiore evidenza, incluso l'invio di una notifica via email quando possibile.</p>
            <p>Si consiglia di consultare periodicamente la presente Informativa sulla privacy per eventuali modifiche. Le modifiche alla presente Informativa sulla privacy entrano in vigore al momento della loro pubblicazione su questa pagina.</p>
          </section>

          <section className="privacy-section">
            <div className="section-header">
              <Mail className="section-icon" size={24} />
              <h2>Contatti</h2>
            </div>
            <p>Per qualsiasi domanda riguardo questa privacy policy o al trattamento dei tuoi dati personali, contatta:</p>
            <div className="contact-details">
              <p><strong>Email:</strong> <Link to="/contattaci" className="privacy-link">sezione.colloqui@riformaeprogresso.it</Link></p>
              <p><strong>Indirizzo:</strong> Via Lungo Crostolo 1, 42121 Reggio Emilia (RE)</p>
              <p><strong>Rappresentante legale:</strong> Michele Bagnato</p>
            </div>
            <div className="compliance-note">
              <p>
                Questa informativa è stata redatta in conformità al Regolamento UE 2016/679 (GDPR) e al Decreto Legislativo 196/2003 
                come modificato dal Decreto Legislativo 101/2018.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;