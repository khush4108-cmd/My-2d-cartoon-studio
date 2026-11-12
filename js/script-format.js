// Defines what a "script" looks like and checks that it is valid.
window.ScriptFormat = {
  EMOTIONS: ['neutral','happy','excited','sad','angry','scared','confused','surprised'],
  BACKGROUNDS: ['park','room','night','beach','street','school'],
  validate(script) {
    const errors = [];
    if (!script || !Array.isArray(script.scenes) || !script.scenes.length) {
      errors.push('The script has no scenes.');
      return errors;
    }
    script.scenes.forEach((sc, i) => {
      if (!this.BACKGROUNDS.includes(sc.bg)) errors.push('Scene ' + (i + 1) + ' has an unknown background: ' + sc.bg);
      if (!sc.beats || !sc.beats.length) errors.push('Scene ' + (i + 1) + ' has no lines.');
    });
    return errors;
  }
};
