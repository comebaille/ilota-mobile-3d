export interface MoveInput {
  x: number;
  y: number;
}

export class InputController {
  readonly move: MoveInput = { x: 0, y: 0 };
  actionDown = false;
  enabled = false;
  private actionPressed = false;
  private joystickPointer: number | null = null;
  private readonly keys = new Set<string>();

  constructor(
    private readonly joystick: HTMLElement,
    private readonly knob: HTMLElement,
    private readonly actionButton: HTMLButtonElement,
  ) {
    joystick.addEventListener('pointerdown', this.onJoystickDown, { passive: false });
    joystick.addEventListener('pointermove', this.onJoystickMove, { passive: false });
    joystick.addEventListener('pointerup', this.onJoystickUp, { passive: false });
    joystick.addEventListener('pointercancel', this.onJoystickUp, { passive: false });
    actionButton.addEventListener('pointerdown', this.onActionDown, { passive: false });
    actionButton.addEventListener('pointerup', this.onActionUp, { passive: false });
    actionButton.addEventListener('pointercancel', this.onActionUp, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
  }

  consumeActionPress(): boolean {
    const value = this.actionPressed;
    this.actionPressed = false;
    return value;
  }

  release(): void {
    this.reset();
  }

  updateKeyboard(): void {
    if (!this.enabled) {
      if (this.joystickPointer === null) this.resetMove();
      return;
    }
    if (this.joystickPointer !== null) return;
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const length = Math.hypot(x, y) || 1;
    this.move.x = x / length;
    this.move.y = y / length;
  }

  private readonly onJoystickDown = (event: PointerEvent): void => {
    if (!this.enabled || this.joystickPointer !== null) return;
    event.preventDefault();
    this.joystickPointer = event.pointerId;
    this.joystick.setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  };

  private readonly onJoystickMove = (event: PointerEvent): void => {
    if (!this.enabled || event.pointerId !== this.joystickPointer) return;
    event.preventDefault();
    this.updateJoystick(event);
  };

  private readonly onJoystickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointer) return;
    event.preventDefault();
    this.joystickPointer = null;
    this.resetMove();
  };

  private updateJoystick(event: PointerEvent): void {
    const rect = this.joystick.getBoundingClientRect();
    const radius = rect.width * 0.34;
    const rawX = event.clientX - (rect.left + rect.width / 2);
    const rawY = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(rawX, rawY);
    const factor = length > radius ? radius / length : 1;
    const x = rawX * factor;
    const y = rawY * factor;
    this.move.x = x / radius;
    this.move.y = -y / radius;
    this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  private readonly onActionDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    this.actionDown = true;
    this.actionPressed = true;
    this.actionButton.classList.add('active');
    this.actionButton.setPointerCapture(event.pointerId);
  };

  private readonly onActionUp = (event: PointerEvent): void => {
    event.preventDefault();
    this.actionDown = false;
    this.actionButton.classList.remove('active');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (!this.enabled || (event.code !== 'KeyE' && event.code !== 'Space')) return;
    event.preventDefault();
    if (!event.repeat) this.actionPressed = true;
    this.actionDown = true;
    this.actionButton.classList.add('active');
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.code !== 'KeyE' && event.code !== 'Space') return;
    this.actionDown = false;
    this.actionButton.classList.remove('active');
  };

  private readonly reset = (): void => {
    this.keys.clear();
    this.joystickPointer = null;
    this.actionDown = false;
    this.actionPressed = false;
    this.actionButton.classList.remove('active');
    this.resetMove();
  };

  private resetMove(): void {
    this.move.x = 0;
    this.move.y = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
  }
}
