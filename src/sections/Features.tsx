import { steps } from '@/lib/steps'

export function Features() {
  return (
    <section aria-labelledby="features-title" className="mx-auto max-w-5xl px-6">
      <h2 id="features-title" className="sr-only">
        Features
      </h2>
      <div className="grid gap-12 md:grid-cols-3 md:gap-10">
        {steps.map((step, i) => (
          <div key={step.label}>
            <h3 className="font-mono text-xs text-muted">
              <span aria-hidden>0{i + 1} </span>
              {step.label}
            </h3>
            <ul className="mt-5 space-y-4">
              {step.features.map(([name, description]) => (
                <li key={name}>
                  <p className="font-medium">{name}</p>
                  <p className="mt-0.5 text-sm/relaxed text-muted">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
