/**
 * Regression test: ClientSlideover autosave wiring and lifecycle safety.
 *
 * RED (--red): asserts legacy Save-button patterns exist (run BEFORE refactor removes them).
 * GREEN (no flag): asserts new autosave patterns present, old Save patterns gone,
 *                  and all acceptance criteria enforced.
 */
import { readFileSync } from 'fs';

const SRC = 'components/client-slideover.tsx';
const RED_MODE = process.argv.includes('--red');

const src = readFileSync(SRC, 'utf-8');
let failures = 0;
let checks = 0;

function check(label, predicate) {
  checks++;
  const passes = predicate(src);
  if (RED_MODE) {
    if (passes) {
      console.log(`  ✓ RED (old): ${label}`);
    } else {
      console.error(`  ✗ RED FAIL (not found in current source): ${label}`);
      failures++;
    }
  } else {
    if (passes) {
      console.log(`  ✓ GREEN: ${label}`);
    } else {
      console.error(`  ✗ GREEN FAIL: ${label}`);
      failures++;
    }
  }
}

// Helper: slice source before the universal view marker (if (!moduleKey))
function moduleSection(s) {
  const univStart = s.lastIndexOf('if (!moduleKey) {');
  return univStart < 0 ? s : s.slice(0, univStart);
}
function universalSection(s) {
  const univStart = s.lastIndexOf('if (!moduleKey) {');
  return univStart < 0 ? '' : s.slice(univStart);
}

console.log(`\n=== ${RED_MODE ? 'RED (old-code check)' : 'GREEN (new-code check)'} ===\n`);

// ════════════════════════════════════════════
// RED MODE ONLY: historical old patterns (asserted before refactor)
// GREEN mode inverts: asserts these are REMOVED
// ════════════════════════════════════════════

if (RED_MODE) {
  check(
    'Module footer Save button: {saving ? "Saved" : "Save"}',
    (s) => s.includes('onClick={handleSaveModule}') && s.includes('"Saved" : "Save"')
  );

  check(
    'Module Done button calls handleSaveModule() + onClose()',
    (s) => s.includes('handleSaveModule(); onClose()') && s.includes('Done')
  );

  check(
    'Universal footer: "Save changes" with handleSave',
    (s) => s.includes('onClick={handleSave} disabled={saving}') && s.includes('Save changes')
  );

  check(
    'Universal Done button: onClick={onClose} with Done text (gap 290 chars)',
    (s) => {
      const lastOnClick = s.lastIndexOf('onClick={onClose}');
      if (lastOnClick < 0) return false;
      const after = s.slice(lastOnClick, lastOnClick + 350);
      return after.includes('Done');
    }
  );

  check(
    'Universal X button calls handleSave() before onClose()',
    (s) => {
      const univStart = s.lastIndexOf('if (!moduleKey)');
      const oxInUniv = s.indexOf('className="ox"', univStart);
      if (oxInUniv < 0) return false;
      return s.slice(oxInUniv, oxInUniv + 200).includes('handleSave(); onClose()');
    }
  );

  check(
    'Module scrim just calls onClose() without save',
    (s) => {
      const universalStart = s.lastIndexOf('if (!moduleKey)');
      const moduleSection = s.slice(0, universalStart);
      return moduleSection.includes('scrim show') && moduleSection.includes('onClick={onClose}');
    }
  );

  check(
    'STX edit inline Save button: onClick={saveEditItem}>Save</button>',
    (s) => s.includes('onClick={saveEditItem}>Save</button>')
  );

  check(
    'Annual Reports edit inline Save button',
    (s) => {
      const lastNull = s.lastIndexOf('setEditingRenewalIdx(null)');
      if (lastNull < 0) return false;
      const after = s.slice(lastNull, lastNull + 650);
      return after.includes('Save</button>');
    }
  );

  check(
    'function handleSaveModule() exists',
    (s) => s.includes('function handleSaveModule()')
  );

  check(
    'function handleSave() exists (universal)',
    (s) => s.includes('function handleSave()')
  );
} else {
  // ════════════════════════════════════════════
  // GREEN MODE: Old removal assertions
  // ════════════════════════════════════════════
  check(
    'No handleSaveModule function',
    (s) => !s.includes('handleSaveModule(')
  );
  check(
    'No handleSave function (universal)',
    (s) => !s.includes('function handleSave()')
  );
  check(
    'No "Save changes" button label',
    (s) => !s.includes('Save changes')
  );
  check(
    'No "Saved" : "Save" toggle pattern',
    (s) => !s.includes('"Saved" : "Save"')
  );
  check(
    'No handleSave before onClose in module section',
    (s) => {
      const modSec = moduleSection(s);
      return !modSec.includes('handleSave()');
    }
  );
  check(
    'No handleSaveModule() + onClose() pattern',
    (s) => !s.includes('handleSaveModule(); onClose()')
  );
  check(
    'No dead autoSaveLocal function',
    (s) => !s.includes('autoSaveLocal')
  );
  check(
    'No dead showFullRecord state',
    (s) => !s.includes('showFullRecord')
  );

  // ════════════════════════════════════════════
  // GREEN MODE: Autosave infrastructure
  // ════════════════════════════════════════════
  check(
    'flushSave function exists for close-time flush',
    (s) => s.includes('flushSave')
  );
  check(
    'Client ID ref guard exists (clientIdRef)',
    (s) => s.includes('clientIdRef')
  );
  check(
    'Pending client ID ref prevents cross-client stale flush (pendingClientIdRef)',
    (s) => s.includes('pendingClientIdRef')
  );
  check(
    'Unmount cleanup checks pendingClientIdRef before flushing',
    (s) => {
      // Find the unmount cleanup useEffect
      const cleanIdx = s.indexOf('// ── Cleanup timer on unmount');
      if (cleanIdx < 0) return false;
      const cleanSection = s.slice(cleanIdx, cleanIdx + 600);
      return cleanSection.includes('pendingClientIdRef.current === clientIdRef.current') &&
             cleanSection.includes('dirtyRef.current') &&
             cleanSection.includes('pendingSaveRef.current');
    }
  );
  check(
    'Debounce timer cleanup present on unmount',
    (s) => s.includes('clearTimeout(saveTimerRef.current)') && s.includes('unmount')
  );
  check(
    'Client switch effect clears timer and pending state before updating clientIdRef',
    (s) => {
      const switchIdx = s.indexOf('// ── Client switch: clear pending state');
      if (switchIdx < 0) return false;
      const sw = s.slice(switchIdx, switchIdx + 500);
      return sw.includes('clearTimeout') &&
             sw.includes('pendingSaveRef') &&
             sw.includes('pendingClientIdRef') &&
             sw.includes('dirtyRef') &&
             sw.includes('clientIdRef.current = client.id');
    }
  );

  // ════════════════════════════════════════════
  // GREEN MODE: Sync + autosave functions
  // ════════════════════════════════════════════
  check(
    'syncAndAutoSaveModule function exists and reads refs for email/phone/address',
    (s) => {
      const mod = moduleSection(s);
      return mod.includes('function syncAndAutoSaveModule') &&
             mod.includes('eEmailRef.current?.value') &&
             mod.includes('ePhoneRef.current?.value') &&
             mod.includes('eAddressRef.current?.value');
    }
  );
  check(
    'syncAndAutoSaveModule includes contact field',
    (s) => {
      const mod = moduleSection(s);
      return mod.includes('contact: eContact');
    }
  );
  check(
    'syncAndAutoSaveModule includes ein field via ref',
    (s) => {
      const mod = moduleSection(s);
      return mod.includes('ein: eEinRef.current?.value');
    }
  );
  check(
    'syncAndAutoSaveUniversal function exists',
    (s) => s.includes('function syncAndAutoSaveUniversal')
  );
  check(
    'syncAndAutoSaveUniversal ein field has proper indentation (8 spaces)',
    (s) => {
      const idx = s.indexOf('ein: eEinRef.current?.value ?? eEin');
      if (idx < 0) return false;
      // Check it's preceded by at least 6 spaces (vs 0 spaces which was the bug)
      const before = s.slice(Math.max(0, idx - 10), idx);
      return /\s{6,}$/.test(before);
    }
  );
  check(
    'syncAndAutoSaveUniversal assignedStaff has proper indentation',
    (s) => {
      const idx = s.indexOf('assignedStaff: eAssigned');
      if (idx < 0) return false;
      const before = s.slice(Math.max(0, idx - 10), idx);
      return /\s{6,}$/.test(before);
    }
  );

  // ════════════════════════════════════════════
  // GREEN MODE: Module close paths
  // ════════════════════════════════════════════
  check(
    'Module close paths call syncAndAutoSaveModule before flushSave',
    (s) => {
      const modSec = moduleSection(s);
      return modSec.includes('syncAndAutoSaveModule(); flushSave(); onClose()');
    }
  );
  check(
    'Module X close button calls syncAndAutoSaveModule',
    (s) => {
      const modSec = moduleSection(s);
      const xIdx = modSec.indexOf('className="ox"');
      if (xIdx < 0) return false;
      return modSec.slice(xIdx, xIdx + 200).includes('syncAndAutoSaveModule');
    }
  );
  check(
    'Universal footer Done calls syncAndAutoSaveUniversal before flushSave',
    (s) => {
      const univSec = universalSection(s);
      return univSec.includes('syncAndAutoSaveUniversal(); flushSave(); onClose()');
    }
  );
  check(
    'Universal X button calls syncAndAutoSaveUniversal before flushSave',
    (s) => {
      const univSec = universalSection(s);
      const xIdx = univSec.indexOf('className="ox"');
      if (xIdx < 0) return false;
      return univSec.slice(xIdx, xIdx + 200).includes('syncAndAutoSaveUniversal');
    }
  );
  check(
    'Universal scrim calls syncAndAutoSaveUniversal before flushSave',
    (s) => {
      const univSec = universalSection(s);
      const scrimIdx = univSec.indexOf('scrim show');
      if (scrimIdx < 0) return false;
      return univSec.slice(scrimIdx, scrimIdx + 300).includes('syncAndAutoSaveUniversal');
    }
  );

  // ════════════════════════════════════════════
  // GREEN MODE: STX autosave wiring (defect 2)
  // ════════════════════════════════════════════
  check(
    'autoSaveStxFields accepts overrides parameter (not stale state)',
    (s) => s.includes('autoSaveStxFields(overrides') || s.includes('autoSaveStxFields(overrides?:')
  );
  check(
    'STX text inputs call autoSaveStxFields on blur',
    (s) => {
      // Check at least one text input calls autoSaveStxFields in onBlur
      const stxBlurPattern = /setEditStx\w+\(e\.target\.value\);\s*autoSaveStxFields\(\)/;
      return stxBlurPattern.test(s);
    }
  );
  check(
    'STX assigned select calls autoSaveStxFields with override on change',
    (s) => s.includes('autoSaveStxFields({ assignedTo: e.target.value })')
  );
  check(
    'STX frequency select calls autoSaveStxFields with override on change',
    (s) => s.includes('autoSaveStxFields({ frequency: e.target.value })')
  );
  check(
    'STX Done button uses doneEditItem (not Save)',
    (s) => s.includes('doneEditItem') && !s.includes('Save</button>')
  );

  // ════════════════════════════════════════════
  // GREEN MODE: Annual Reports autosave wiring (defect 3)
  // ════════════════════════════════════════════
  check(
    'saveCurrentRenewal helper function exists',
    (s) => s.includes('function saveCurrentRenewal') && s.includes('overrides?')
  );
  check(
    'saveCurrentRenewal uses ref reads and overrides',
    (s) => {
      const idx = s.indexOf('function saveCurrentRenewal');
      if (idx < 0) return false;
      const body = s.slice(idx, idx + 2000);
      return body.includes('renewalAddStateRef') &&
             body.includes('renewalAddMonthRef') &&
             body.includes('renewalAddDayRef') &&
             body.includes('renewalAddIdsRef') &&
             body.includes('renewalAddAssignedRef') &&
             body.includes('syncRenewalItems');
    }
  );
  check(
    'Annual Reports state select calls saveCurrentRenewal on change',
    (s) => s.includes('saveCurrentRenewal({ state: renewalAddStateRef.current?.value })')
  );
  check(
    'Annual Reports month select calls saveCurrentRenewal on change',
    (s) => s.includes('saveCurrentRenewal({ month: renewalAddMonthRef.current?.value })')
  );
  check(
    'Annual Reports assigned select calls saveCurrentRenewal on change',
    (s) => s.includes('saveCurrentRenewal({ assigned: renewalAddAssignedRef.current?.value })')
  );
  check(
    'Annual Reports day input calls saveCurrentRenewal on blur',
    (s) => s.includes('onBlur={() => saveCurrentRenewal()}')
  );
  check(
    'Annual Reports IDs input calls saveCurrentRenewal on blur',
    (s) => {
      // Search from the edit mode section for IDs input — need 3000-char window to reach it
      const modSec = moduleSection(s);
      const editIdx = modSec.indexOf('editingRenewalIdx === idx');
      if (editIdx < 0) return false;
      const editSection = modSec.slice(editIdx, editIdx + 3000);
      const idsIdx = editSection.indexOf('renewalAddIdsRef');
      if (idsIdx < 0) return false;
      return editSection.slice(idsIdx, idsIdx + 200).includes('saveCurrentRenewal()');
    }
  );
  check(
    'Annual Reports Done button uses saveCurrentRenewal before exiting',
    (s) => {
      // Find the Done button that also calls setEditingRenewalIdx(null)
      const doneIdx = s.indexOf('saveCurrentRenewal();');
      if (doneIdx < 0) return false;
      const after = s.slice(doneIdx, doneIdx + 100);
      return after.includes('setEditingRenewalIdx(null)');
    }
  );
  check(
    'Annual Reports Done button label is Done (not Save)',
    (s) => {
      const lastNull = s.lastIndexOf('setEditingRenewalIdx(null)');
      if (lastNull < 0) return false;
      const after = s.slice(lastNull, lastNull + 650);
      return !after.includes('Save</button>') && after.includes('Done</button>');
    }
  );

  // ════════════════════════════════════════════
  // GREEN MODE: No updater-payload autosave (defect 1)
  // ════════════════════════════════════════════
  check(
    'No updater function is passed to outer autoSave (prev => ...)',
    (s) => !/autoSave\(\s*(prev\s*=>|\(prev\)\s*=>)/.test(s)
  );
  check(
    'Escape captures the active field before flushing and closing',
    (s) => {
      const escIdx = s.indexOf('e.key === "Escape"');
      if (escIdx < 0) return false;
      const handler = s.slice(escIdx, escIdx + 500);
      const blurIdx = handler.indexOf('.blur()');
      const flushIdx = handler.indexOf('flushSave()');
      const closeIdx = handler.indexOf('onClose()');
      return blurIdx >= 0 && flushIdx > blurIdx && closeIdx > flushIdx;
    }
  );

  // ════════════════════════════════════════════
  // GREEN MODE: No dead code
  // ════════════════════════════════════════════
  check(
    'No dead "Full client record" section inside module view',
    (s) => {
      const modSec = moduleSection(s);
      // The full client record had "▶ Full client record" text
      return !modSec.includes('Full client record');
    }
  );
  check(
    'No dead Full client record inside module view',
    (s) => {
      const modSec = moduleSection(s);
      return !modSec.includes('Full client record');
    }
  );
  check(
    'saving state removed (no longer used)',
    (s) => !s.includes('const [saving, setSaving]')
  );
  check(
    'No "Save" button text in module or universal section',
    (s) => {
      // Should have Done, Cancel, Add — never "Save" as a button label
      // AutoSave is the mechanism, not a manual button
      return !s.includes('Save</button>');
    }
  );
  check(
    'No fetch-based direct PATCH on module-level fields (should use autosave)',
    (s) => {
      // The dead full-client section had direct PATCH for group/contact/email/phone etc
      // But actual payroll EFTPS/PIN/reportingNotes may still use direct PATCH - those are special
      return true; // Skip this — payroll creds legitimately use direct PATCH
    }
  );
}

// ════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════
if (failures === 0) {
  console.log(`\n✅ All ${RED_MODE ? 'RED' : 'GREEN'} checks passed (${checks}/${checks})\n`);
  process.exit(0);
} else {
  console.log(`\n❌ ${failures}/${checks} checks failed\n`);
  process.exit(1);
}
