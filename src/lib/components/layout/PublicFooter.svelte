<script lang="ts">
</script>

<footer class="luxury-footer relative z-10">
    <div class="footer-grid">
        <div class="brand-col">
            <span class="brand-accent h3">AFE</span> Resort
            <p class="address">Av. El Mirador, San Salvador,<br/>El Salvador, CA 00106</p>
        </div>
        <div class="links-col">
            <h4>Experiencias</h4>
            <a href="/rooms">Habitaciones</a>
            <a href="#">El Spa</a>
            <a href="#">Restaurantes</a>
        </div>
        <div class="links-col">
            <h4>Soporte</h4>
            <a href="/profile/reservations">Mis Reservas</a>
            <a href="#">Políticas de Cancelación</a>
            <a href="#">Contacto</a>
        </div>
        <div class="social-col">
            <h4>Síguenos</h4>
            <div class="social-links">
                <a href="#">Instagram</a>
                <a href="#">Twitter</a>
                <a href="#">Facebook</a>
            </div>
        </div>
    </div>
    <div class="footer-copy">
        &copy; {new Date().getFullYear()} Gran Hotel AFE. Excellence in Hospitality.
    </div>
</footer>

<style>
    .luxury-footer {
        background: var(--bg-alt);
        border-top: 1px solid var(--border-light);
        padding: 8rem 5% 4rem;
        margin-top: auto;
    }
    
    .footer-grid {
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 4rem;
    }
    
    .brand-col {
        font-family: 'Outfit', sans-serif;
        font-size: 2rem;
        font-weight: 300;
        letter-spacing: 2px;
        text-transform: uppercase;
    }
    
    .brand-accent {
        font-weight: 800;
        color: #D4AF37;
    }
    
    .address {
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-top: 1.5rem;
        line-height: 1.8;
        text-transform: none;
        letter-spacing: 0;
    }
    
    .links-col h4, .social-col h4 {
        font-family: 'Outfit', sans-serif;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 3px;
        color: #D4AF37;
        margin-bottom: 2rem;
    }
    
    .links-col a, .social-links a {
        display: block;
        color: var(--text-muted);
        text-decoration: none;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        transition: color 0.3s, transform 0.3s;
    }
    
    .links-col a:hover, .social-links a:hover {
        color: var(--text-main);
        transform: translateX(5px);
    }
    
    .footer-copy {
        max-width: 1400px;
        margin: 6rem auto 0;
        padding-top: 2rem;
        border-top: 1px solid var(--border-light);
        text-align: center;
        font-size: 0.75rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 2px;
    }

    @media (max-width: 1024px) {
        .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
        }
    }
    
    @media (max-width: 640px) {
        .footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
        }
        .links-col a:hover, .social-links a:hover {
            transform: translateY(-3px);
        }
    }
</style>
