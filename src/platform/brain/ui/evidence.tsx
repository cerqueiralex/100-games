import { useState } from 'react';
import type { BrainReference, BrainTip, BrainTrainingLink } from '../types';
import type { CoachAction, CoachInsight, CoachReport } from '../coach';
import { getGame } from '../../registry';
import { gameIcons } from '../../design/gameIcons';
import { ChevronIcon, ExternalLinkIcon } from '../../design/icons';
import { sfx } from '../../audio';
import { PadTool } from '../../components/ui';
import { TRAINING_NOTE } from '../domains';
import { REFS_VERIFIED_AT } from '../references';

/**
 * Evidence on screen — the owner's rule is "no source, no claim", so every
 * area, training link, tip and coach insight shows its sources one tap away
 * (a disclosure, so the cards stay calm). Sources come only from
 * references.ts (Crossref-verified); validate proves it.
 */

/** "Sources (3)" disclosure with the full citations as external links */
export function SourceList({ sources, label = 'Sources' }: { sources: readonly BrainReference[]; label?: string }) {
  if (!sources.length) return null;
  return (
    <details className="bl-sources">
      <summary>
        {label} ({sources.length})
      </summary>
      <ul className="bl-refs">
        {sources.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <span>
                {r.label}
                {r.note && <small>{r.note}</small>}
              </span>
              <ExternalLinkIcon size={14} />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** the full citations, always open — the wiki's form of SourceList */
export function RefList({ sources }: { sources: readonly BrainReference[] }) {
  return (
    <ul className="bl-refs">
      {sources.map((r) => (
        <li key={r.url}>
          <a href={r.url} target="_blank" rel="noopener noreferrer">
            <span>
              {r.label}
              {r.note && <small>{r.note}</small>}
            </span>
            <ExternalLinkIcon size={14} />
          </a>
        </li>
      ))}
    </ul>
  );
}

const KIND_LABEL: Record<BrainTip['kind'], string> = {
  habit: 'Habit',
  practice: 'Practice',
  strategy: 'Strategy',
  measurement: 'Measuring well'
};

/** evidence-based tips, each with its kind and sources */
export function TipList({ tips, compact = false, sources = true }: { tips: readonly BrainTip[]; compact?: boolean; sources?: boolean }) {
  return (
    <ul className={`bl-tips${compact ? ' compact' : ''}`}>
      {tips.map((t) => (
        <li key={t.id} className="bl-tip">
          <span className="bl-tip-kind">{KIND_LABEL[t.kind]}</span>
          <strong className="bl-tip-title">{t.title}</strong>
          <p className="bl-tip-body">{t.body}</p>
          {sources && <SourceList sources={t.sources} />}
        </li>
      ))}
    </ul>
  );
}

/** a training shortcut with the paradigm it mirrors, the honest evidence line and its sources */
export function TrainingCard({
  link,
  onOpenGame,
  lead,
  sources = true
}: {
  link: BrainTrainingLink;
  onOpenGame: (id: string) => void;
  lead?: string;
  /** false where the evidence lives elsewhere (the area wiki) */
  sources?: boolean;
}) {
  const game = getGame(link.gameId);
  if (!game) return null;
  return (
    <div className="bl-train-card fx-card">
      <button
        type="button"
        className="bl-train-head"
        onClick={() => {
          sfx.tap();
          onOpenGame(link.gameId);
        }}
      >
        <span className="bl-train-icon" aria-hidden>
          {gameIcons[link.gameId]}
        </span>
        <span className="bl-train-main">
          <strong>{game.name}</strong>
          <span className="bl-train-why">
            {lead ? `${lead} ` : ''}
            {link.why}
          </span>
        </span>
        <ChevronIcon size={18} />
      </button>
      <div className="bl-train-evidence">
        <span className="bl-train-paradigm">Mirrors: {link.paradigm}</span>
        <p>{link.evidence}</p>
        <span className="bl-train-note">{TRAINING_NOTE}</span>
        {sources && <SourceList sources={link.sources} label="Evidence" />}
      </div>
    </div>
  );
}

const TONE_LABEL: Record<CoachInsight['tone'], string> = { up: 'Going well', neutral: 'Worth knowing', focus: 'Work on this' };

/**
 * The coach panel: what the coach had to go on, then each insight as a card
 * (the first card IS the headline, so there is no separate one) — what it
 * says, WHY (the player's own data that triggered it), the evidence-based
 * actions, the rule's sources and one optional action button.
 */
export function CoachPanel({
  report,
  onAction,
  limit = 6
}: {
  report: CoachReport;
  onAction?: (a: CoachAction) => void;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? report.insights : report.insights.slice(0, limit);
  return (
    <div className="bl-coach">
      <p className="bl-note">
        Based on {report.basis.scoredRuns} scored run{report.basis.scoredRuns === 1 ? '' : 's'}, {report.basis.checkins14d} check-in
        {report.basis.checkins14d === 1 ? '' : 's'} in the last 14 days and {report.basis.areasWithLevel} area
        {report.basis.areasWithLevel === 1 ? '' : 's'} with a level. Every tip cites its research (references verified {REFS_VERIFIED_AT}).
      </p>
      <ol className="bl-coach-list">
        {shown.map((i) => (
          <li key={i.id} className={`bl-insight fx-card tone-${i.tone}`}>
            <span className="bl-insight-tone">
              <i aria-hidden />
              {TONE_LABEL[i.tone]}
            </span>
            <strong className="bl-insight-title">{i.title}</strong>
            <p className="bl-insight-body">{i.body}</p>
            <p className="bl-insight-why">
              <span>Why:</span> {i.why}
            </p>
            {i.tips.length > 0 && (
              <details className="bl-insight-tips">
                <summary>What you can do ({i.tips.length})</summary>
                <TipList tips={i.tips} compact />
              </details>
            )}
            <SourceList sources={i.sources} label="Research behind this" />
            {i.action && onAction && (
              <PadTool type="button" className="bl-insight-action" silent onClick={() => onAction(i.action!)}>
                {i.action.label}
              </PadTool>
            )}
          </li>
        ))}
      </ol>
      {report.insights.length > limit && (
        <PadTool type="button" className="bl-coach-more" onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show all ${report.insights.length}`}
        </PadTool>
      )}
    </div>
  );
}
