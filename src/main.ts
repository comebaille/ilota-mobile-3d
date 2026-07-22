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
        ui.resetButton.textContent = 'Recommencer l’île';
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
