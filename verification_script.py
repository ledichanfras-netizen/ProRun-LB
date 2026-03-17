from playwright.sync_api import Page, expect, sync_playwright
import os

def verify_app(page: Page):
    # Go to login page
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)

    # Take initial screenshot
    page.screenshot(path="/home/jules/verification/login.png")

    # Login as coach
    page.get_by_placeholder("Digite seu nome").fill("leandro")
    page.get_by_placeholder("Sua senha").fill("1234")
    page.get_by_role("button", name="Entrar").click()
    page.wait_for_timeout(3000)

    # Check if dashboard is visible
    page.screenshot(path="/home/jules/verification/after_login.png")

    # Search for "Dashboard" or "Análise"
    analysis_link = page.get_by_role("link", name="Análise")
    if analysis_link.is_visible():
        analysis_link.click()
        page.wait_for_timeout(2000)
        page.screenshot(path="/home/jules/verification/performance.png")

    periodization_link = page.get_by_role("link", name="Periodização")
    if periodization_link.is_visible():
        periodization_link.click()
        page.wait_for_timeout(2000)
        page.screenshot(path="/home/jules/verification/periodization.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/video", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/video")
        page = context.new_page()
        try:
            verify_app(page)
        finally:
            context.close()
            browser.close()
