import './styles.css';
import { AssetLibrary } from './game/assets';
import { IlotaGame, restoreEconomy } from './game/IlotaGame';
import { GameUI } from './ui/GameUI';

interface IlotaWindow extends Window {
  __ILOTA__?: {
    ready: boolean;
    active: boolean;
    assetsLoaded: number;
    wood: number;
    stone: number;
    copper: number;
    crystal: number;
    campBuilt: boolean;
    workers: number;
    workerLevels: number;
    workerTasks: string;
    bridgeBuilt: boolean;
    bridges: number;
    chapter: number;
    cacheFound: boolean;
    completed: boolean;
    crewOpen: boolean;
    talentOpen: boolean;
    knowledge: number;
    rebirths: number;
    skills: string;
    autoRegulation: boolean;
    workersOnWalkable: boolean;
    workerNavigation: Array<{
      id: string;
      x: number;
      z: number;
      phase: string;
      routeBridges: number[];
      bridgesUsed: number[];
      routeDistance: number;
    }>;
    player: { x: number; z: number };
    facingAlignment: number;
    lastHarvest: { kind: string; remaining: number; capacity: number; scale: number } | null;
    fps: number;
  };
}

const launch = async (): Promise<void> => {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas du jeu introuvable.');

  const ui = new GameUI();
  const economy = restoreEconomy();
  const assets = new AssetLibrary();

  try {
    await assets.load((progress, label) => ui.setLoading(progress, label));
    const game = new IlotaGame(canvas, assets, economy, ui);
    (window as IlotaWindow).__ILOTA__ = game.diagnostics;

    if (economy.progress.campBuilt || economy.progress.wood > 0 || economy.progress.stone > 0) {
      ui.startButton.textContent = 'REPRENDRE LA PARTIE';
    }

    ui.startButton.addEventListener('click', () => {
      ui.start();
      game.start();
    });
    ui.continueButton.addEventListener('click', () => game.continueAfterVictory());
    let rebirthArmed = false;
    let rebirthTimer = 0;
    ui.rebirthButton.addEventListener('click', () => {
      if (rebirthArmed) {
        window.clearTimeout(rebirthTimer);
        game.beginNewTide();
        return;
      }
      rebirthArmed = true;
      ui.rebirthButton.textContent = 'CONFIRMER LA NOUVELLE MARÉE';
      ui.toast('La carte et l’équipe recommenceront, mais tes talents et ton Savoir resteront.');
      rebirthTimer = window.setTimeout(() => {
        rebirthArmed = false;
        ui.rebirthButton.textContent = 'LANCER UNE NOUVELLE MARÉE';
      }, 4500);
    });
    let resetArmed = false;
    let resetTimer = 0;
    ui.resetButton.addEventListener('click', () => {
      if (resetArmed) {
        window.clearTimeout(resetTimer);
        game.resetProgress();
        return;
      }
      resetArmed = true;
      ui.resetButton.textContent = 'Confirmer la remise à zéro';
      ui.toast('Appuie encore une fois pour effacer toute la progression.');
      resetTimer = window.setTimeout(() => {
        resetArmed = false;
        ui.resetButton.textContent = 'Effacer toute la progression';
      }, 3500);
    });
    ui.finishLoading();
  } catch (error) {
    console.error('Échec du chargement d’Ilota', error);
    ui.showFatal();
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
        console.warn('Service worker non enregistré', error);
      });
    });
  }
};

document.addEventListener('contextmenu', (event) => event.preventDefault());
void launch();
